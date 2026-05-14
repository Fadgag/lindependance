import { prisma } from '@/lib/prisma'
import Decimal from 'decimal.js'
import type { Prisma } from '@prisma/client'
import type { DashboardTotals } from '@/types/dashboard'
import parseSoldProducts from '@/lib/parseSoldProducts'
import {
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  subDays
} from 'date-fns'

export type PeriodParam = string | { start?: Date; end?: Date }

const pad = (n: number) => String(n).padStart(2, '0')

export async function getDashboardForOrg(orgId: string, periodOrRange: PeriodParam = "30days") {
  let start: Date;
  let end: Date;

  // 1. Définition dynamique de la plage de dates selon l'onglet ou l'intervalle fourni
  if (typeof periodOrRange === 'object' && (periodOrRange.start || periodOrRange.end)) {
    // Utilisateur / API a fourni un range explicite
    start = periodOrRange.start ?? subDays(new Date(), 30)
    end = periodOrRange.end ?? endOfDay(new Date())
  } else {
    const period = String(periodOrRange ?? '30days')
    switch (period) {
      case "today":
        start = startOfDay(new Date());
        end = endOfDay(new Date());
        break;
      case "week":
        // Semaine en cours (du lundi au dimanche par ex)
        start = startOfWeek(new Date(), { weekStartsOn: 1 });
        end = endOfWeek(new Date(), { weekStartsOn: 1 });
        break;
      case "month":
        // Mois entier : du 1er au 30/31 (inclut le futur proche)
        start = startOfMonth(new Date());
        end = endOfMonth(new Date());
        break;
      case "30days":
      default:
        // Vue glissante : 30 jours en arrière jusqu'à aujourd'hui minuit
        start = subDays(new Date(), 30);
        end = endOfDay(new Date());
        break;
    }
  }

  // Helper: ISO date string (UTC) pour le filtrage sur startDate (String? dans Prisma)

  // 2. Récupération des données — on utilise findMany pour garantir la présence des soldProducts
  // Select only the appointment fields we need to avoid selecting DB columns that might not
  // yet exist in the database (e.g. soldProductsJson/productsTotal) while migration is pending.
  const detailRows = await prisma.appointment.findMany({
    where: { organizationId: orgId, startTime: { gte: start, lte: end }, status: { not: 'CANCELLED' } },
    select: {
      id: true,
      startTime: true,
      status: true,
      finalPrice: true,
      price: true,
      soldProducts: true,
      service: { select: { price: true } }
    },
    orderBy: { startTime: 'asc' }
  })

  let totalRealized = new Decimal(0)
  let totalProjected = new Decimal(0)
  let totalRealizedServices = new Decimal(0)
  let totalRealizedProducts = new Decimal(0)
  let totalProjectedServices = new Decimal(0)
  let totalProjectedProducts = new Decimal(0)
  let totalTaxCollected = new Decimal(0)

  const map = new Map<string, { realized: Decimal; projected: Decimal; count: number }>()

  for (const a of detailRows) {
    const ad = new Date(a.startTime)
    const key = `${ad.getUTCFullYear()}-${pad(ad.getUTCMonth() + 1)}-${pad(ad.getUTCDate())}`
    const cur = map.get(key) ?? { realized: new Decimal(0), projected: new Decimal(0), count: 0 }
    // Consider appointment as paid when status explicitly marks it as paid
    // (some legacy rows may use 'PAYED') or when a finalPrice was recorded (> 0).
    const isPaid = a.status === 'PAID' || a.status === 'PAYED' || (a.finalPrice != null && a.finalPrice > 0)
    // service price
    const servicePriceValue = a.service?.price ?? 0
    const serviceDec = new Decimal(String(servicePriceValue))
    // products on appointment
    let productsSum = new Decimal(0)
    let productsTaxSum = new Decimal(0)
    // Use Prisma.JsonValue typing for JSON fields instead of `any`
    const rawSold = (a.soldProducts as Prisma.JsonValue | null) ?? null
    if (rawSold) {
      try {
        type SoldLine = { totalTTC?: number; priceTTC?: number; quantity?: number; totalTax?: number; taxRate?: number }
        const rawSoldValue = rawSold as unknown
        const arr = typeof rawSoldValue === 'string'
          // RAISON: narrowing typeof === 'string' est effectué juste au-dessus — le cast est sûr.
          ? (JSON.parse(rawSoldValue as string) as SoldLine[])
          : (rawSoldValue as SoldLine[])
        if (Array.isArray(arr)) {
          for (const it of arr) {
            const qty = typeof it.quantity === 'number' ? it.quantity : (it.quantity ? Number(it.quantity) : 1)
            const unit = typeof it.priceTTC === 'number' ? it.priceTTC : (it.priceTTC ? Number(it.priceTTC) : 0)
            const lineTotal = new Decimal(String(it.totalTTC ?? (unit * (qty || 1))))
            productsSum = productsSum.plus(lineTotal)
            // compute tax per line (don't add to global until we know the appointment is paid)
            const lineTax = typeof it.totalTax === 'number'
              ? new Decimal(String(it.totalTax))
              : (it.taxRate ? lineTotal.minus(lineTotal.dividedBy(new Decimal(1).plus(new Decimal(String(it.taxRate)).dividedBy(100)))) : new Decimal(0))
            productsTaxSum = productsTaxSum.plus(lineTax)
          }
        }
      } catch {
        // ignore JSON parse / shape errors for backward compatibility
      }
    }
    // Prefer `finalPrice` when available (actual amount paid / recorded) — this
    // ensures reported CA (réalisé / prévisionnel) respects discounts / adjustments
    // that may have been stored in `finalPrice`.
    const price = a.finalPrice != null ? new Decimal(String(a.finalPrice)) : serviceDec.plus(productsSum)
    // allocate service vs product totals
    if (isPaid) {
      totalRealized = totalRealized.plus(price)
      totalRealizedServices = totalRealizedServices.plus(serviceDec)
      totalRealizedProducts = totalRealizedProducts.plus(productsSum)
      totalTaxCollected = totalTaxCollected.plus(productsTaxSum)
      cur.realized = cur.realized.plus(price)
    }
    totalProjected = totalProjected.plus(price)
    totalProjectedServices = totalProjectedServices.plus(serviceDec)
    totalProjectedProducts = totalProjectedProducts.plus(productsSum)
    cur.projected = cur.projected.plus(price)
    cur.count += 1
    map.set(key, cur)
  }

  // 3. Génération de la timeseries sans "trous"
  const msPerDay = 24 * 60 * 60 * 1000
  // On utilise les dates UTC pour éviter les décalages d'heures d'été/hiver sur le graph
  const startUTC = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())
  const endUTC = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate())

  const days: Date[] = []
  for (let t = startUTC; t <= endUTC; t += msPerDay) {
    days.push(new Date(t))
  }

  // dailyTarget — guard pour compatibilité avec les mocks de test
  let target = 0
  if (prisma && typeof prisma.organization?.findUnique === 'function') {
    try {
      const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { dailyTarget: true } })
      target = org?.dailyTarget ?? 0
    } catch {
      target = 0
    }
  }

  const timeseries = days.map((d) => {
    const key = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
    const val = map.get(key) ?? { realized: new Decimal(0), projected: new Decimal(0), count: 0 }
    return {
      date: key,
      realized: val.realized.toNumber(),
      planned: val.projected.toNumber(),
      // `revenue` maintenu pour compatibilité avec les tests API existants
      revenue: val.projected.toNumber(),
      count: val.count,
      target,
    }
  })

  // 4. Indicateurs transverses
  const newCustomerCount = await prisma.customer.count({
    where: {
      organizationId: orgId,
      createdAt: { gte: start, lte: end }
    }
  })

  const staffCount = await prisma.staff.count({
    where: { organizationId: orgId }
  })

  return {
    summary: {
      totalRevenue: totalProjected.toNumber(),      // legacy: compatibilité descendante
      realizedRevenue: totalRealized.toNumber(),    // CA encaissé
      projectedRevenue: totalProjected.toNumber(),  // CA Prévisionnel
      serviceRevenue: totalRealizedServices.toNumber(),
      productRevenue: totalRealizedProducts.toNumber(),
      totalTaxCollected: totalTaxCollected.toNumber(),
      totalProjected: totalProjected.toNumber(),    // alias explicite utilisé par les tests
      appointmentCount: detailRows.length,
      newCustomerCount,
      staffCount
    },
    timeseries
  }
}

const dashboardService = { getDashboardForOrg }
export default dashboardService

export type DashboardDetailItem = {
  appointmentId: string
  date: string
  clientName: string
  serviceName: string
  productsSum: number
  totalTTC: number
  products: Array<{ productId?: string; name?: string; priceTTC?: number; quantity?: number }>
}

export async function getDashboardDetails(orgId: string, from: Date, to: Date, filter: 'all' | 'services' | 'products' = 'all', page = 1, pageSize = 50, onlyPaid = false) {
  const baseWhere: Prisma.AppointmentWhereInput = { organizationId: orgId, startTime: { gte: from, lte: to }, status: { not: 'CANCELLED' } }
  if (onlyPaid) {
    // Consider an appointment as paid if:
    // - status explicitly marks it as paid (some records use 'PAID' or 'PAYED'),
    // - OR a finalPrice > 0 was recorded.
    // We intentionally include the 'PAYED' variant for legacy data.
    baseWhere.AND = [{ OR: [{ status: 'PAID' }, { status: 'PAYED' }, { finalPrice: { gt: 0 } }] }]
  }

  // Build where filter — productsTotal column is stable in prod (migration applied)
  const buildFilterWhere = (base: Prisma.AppointmentWhereInput) => {
    const w: Prisma.AppointmentWhereInput = JSON.parse(JSON.stringify(base))
    if (filter === 'services') {
      w.AND = [{ OR: [
        { soldProducts: null },
        { soldProducts: '' },
        { soldProducts: '[]' },
        { productsTotal: { equals: 0 } },
        { productsTotal: null },
      ]}]
    } else if (filter === 'products') {
      w.AND = [
        { OR: [{ productsTotal: { gt: 0 } }, { soldProducts: { not: null } }] },
        { NOT: { soldProducts: '' } },
        { NOT: { soldProducts: '[]' } },
      ]
    }
    return w
  }

  const whereForQuery = buildFilterWhere(baseWhere)

  const rows = await prisma.appointment.findMany({
    where: whereForQuery,
    select: {
      id: true,
      startTime: true,
      status: true,
      finalPrice: true,
      price: true,
      soldProducts: true,
      customer: { select: { firstName: true, lastName: true } },
      service: { select: { name: true, price: true } }
    },
    orderBy: { startTime: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize
  })
  const total = await prisma.appointment.count({ where: whereForQuery })

  // Define a local type that includes the potential new column `soldProductsJson`.
  type AppointmentRow = (typeof rows)[number] & { soldProductsJson?: unknown }

  const items: DashboardDetailItem[] = []
  for (const aRaw of rows) {
    // RAISON: `rows` est typé par Prisma sans `soldProductsJson` (colonne optionnelle v2) — cast nécessaire pour accéder au champ sans any
    const a = aRaw as AppointmentRow
    const clientName = a.customer ? `${a.customer.firstName} ${a.customer.lastName}`.trim() : '—'
    const serviceName = a.service?.name ?? '—'

    // parse products using shared helper
    const rawSold = (a.soldProductsJson ?? a.soldProducts) as unknown
    const parsed = parseSoldProducts(rawSold)
    const productsSum = parsed.sum
    const products = parsed.products

    const servicePrice = a.service?.price ? Number(a.service.price) : 0
    const totalTTC = (a.finalPrice != null ? Number(a.finalPrice) : (servicePrice + productsSum))

    items.push({ appointmentId: a.id, date: a.startTime.toISOString(), clientName, serviceName, productsSum, totalTTC, products })
  }

  // Compute accurate totals for the entire filtered set (not just the page)
  // Select all appointments matching the filter (no pagination) to compute totals.
  type TotalsRow = { finalPrice: number | null; service?: { price?: Prisma.Decimal | null } | null; soldProducts?: unknown; productsTotal?: number | null }
  const allForTotals: TotalsRow[] = await prisma.appointment.findMany({
    where: whereForQuery,
    select: { finalPrice: true, service: { select: { price: true } }, soldProducts: true, productsTotal: true }
  })

  const computedTotals: DashboardTotals = { totalAmount: 0, totalServicesSum: 0, totalProductsSum: 0 }
  for (const r of allForTotals) {
    const finalP = r.finalPrice != null ? Number(r.finalPrice) : null
    const prodSum = r.productsTotal != null ? Number(r.productsTotal || 0) : parseSoldProducts(r.soldProducts).sum
    const servicePriceVal = r.service?.price ? Number(r.service.price) : 0
    if (finalP != null) computedTotals.totalAmount += finalP
    else computedTotals.totalAmount += servicePriceVal + prodSum
    computedTotals.totalServicesSum += servicePriceVal
    computedTotals.totalProductsSum += prodSum
  }

  return { items, total, totals: computedTotals }
}


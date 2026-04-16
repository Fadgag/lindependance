import { prisma } from '@/lib/prisma'
import Decimal from 'decimal.js'
import type { Prisma } from '@prisma/client'
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
  type AppointmentWithService = Prisma.AppointmentGetPayload<{ include: { service: { select: { price: true } } } }>

  const detailRows: AppointmentWithService[] = await prisma.appointment.findMany({
    where: { organizationId: orgId, startTime: { gte: start, lte: end }, status: { not: 'CANCELLED' } },
    include: { service: { select: { price: true } } },
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
    const isPaid = a.status === 'PAID'
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
    const price = serviceDec.plus(productsSum)
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

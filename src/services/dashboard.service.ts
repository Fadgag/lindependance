import { prisma } from '../lib/prisma'
import Decimal from 'decimal.js'
import type { Prisma } from '@prisma/client'
import type { DashboardData } from '../types/models'
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

export async function getDashboardForOrg(orgId: string, periodOrRange: PeriodParam = "30days"): Promise<DashboardData> {
  let start: Date;
  let end: Date;

  // 1. Définition dynamique de la plage de dates selon l'onglet ou l'intervalle fourni
  if (typeof periodOrRange === 'object' && (periodOrRange.start || periodOrRange.end)) {
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
        start = startOfWeek(new Date(), { weekStartsOn: 1 });
        end = endOfWeek(new Date(), { weekStartsOn: 1 });
        break;
      case "month":
        start = startOfMonth(new Date());
        end = endOfMonth(new Date());
        break;
      case "30days":
      default:
        start = subDays(new Date(), 30);
        end = endOfDay(new Date());
        break;
    }
  }

  const pad = (n: number) => String(n).padStart(2, '0')

  // 2. Récupération des rendez-vous — toujours via findMany pour distinguer PAID vs prévisionnel
  // BUG CORRIGÉ : le chemin groupBy filtrait sur startDate (champ TEXT non rempli → toujours NULL)
  //              ce qui retournait [] (truthy) et court-circuitait ce fallback correct.
  type AppointmentRow = Prisma.AppointmentGetPayload<{
    select: {
      startTime: true
      status: true
      finalPrice: true
      service: { select: { price: true } }
    }
  }>

  const appointments: AppointmentRow[] = await prisma.appointment.findMany({
    where: {
      organizationId: orgId,
      startTime: { gte: start, lte: end },
      status: { not: 'CANCELLED' },
    },
    select: {
      startTime: true,
      status: true,
      finalPrice: true,
      service: { select: { price: true } },
    },
    orderBy: { startTime: 'asc' },
  })

  let totalRealized = new Decimal(0)
  let totalProjected = new Decimal(0)

  const map = new Map<string, { realized: Decimal; projected: Decimal; count: number }>()

  for (const a of appointments) {
    const ad = new Date(a.startTime)
    const key = `${ad.getUTCFullYear()}-${pad(ad.getUTCMonth() + 1)}-${pad(ad.getUTCDate())}`
    const cur = map.get(key) ?? { realized: new Decimal(0), projected: new Decimal(0), count: 0 }

    const isPaid = a.status === 'PAID'
    const servicePrice = a.service?.price != null ? Number(a.service.price) : 0

    // CA Réalisé : finalPrice si encaissé (inclut les extras), sinon 0
    const realizedValue = isPaid ? (a.finalPrice ?? servicePrice) : 0
    // CA Prévisionnel : prix du service (estimation avant encaissement)
    const projectedValue = servicePrice

    const realizedDec = new Decimal(String(realizedValue))
    const projectedDec = new Decimal(String(projectedValue))

    if (isPaid) {
      totalRealized = totalRealized.plus(realizedDec)
      cur.realized = cur.realized.plus(realizedDec)
    }
    totalProjected = totalProjected.plus(projectedDec)
    cur.projected = cur.projected.plus(projectedDec)
    cur.count += 1
    map.set(key, cur)
  }

  // 3. Génération de la timeseries sans "trous"
  const msPerDay = 24 * 60 * 60 * 1000
  const startUTC = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())
  const endUTC = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate())

  const days: Date[] = []
  for (let t = startUTC; t <= endUTC; t += msPerDay) {
    days.push(new Date(t))
  }

  // dailyTarget
  let target = 0
  try {
    const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { dailyTarget: true } })
    target = org?.dailyTarget ?? 0
  } catch {
    target = 0
  }

  const timeseries = days.map((d) => {
    const key = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
    const val = map.get(key) ?? { realized: new Decimal(0), projected: new Decimal(0), count: 0 }
    return {
      date: key,
      realized: val.realized.toNumber(),
      planned: val.projected.toNumber(),
      revenue: val.projected.toNumber(), // compatibilité ascendante
      count: val.count,
      target,
    }
  })

  // 4. Indicateurs transverses
  const newCustomerCount = await prisma.customer.count({
    where: { organizationId: orgId, createdAt: { gte: start, lte: end } }
  })

  const staffCount = await prisma.staff.count({
    where: { organizationId: orgId }
  })

  return {
    summary: {
      totalRevenue: totalProjected.toNumber(),       // legacy
      realizedRevenue: totalRealized.toNumber(),     // CA encaissé (PAID × finalPrice)
      projectedRevenue: totalProjected.toNumber(),   // CA prévisionnel (tous RDV × prix service)
        totalProjected: totalProjected.toNumber(),
      appointmentCount: appointments.length,
      newCustomerCount,
      staffCount,
    },
    timeseries,
  }
}

const dashboardService = { getDashboardForOrg }
export default dashboardService

import { prisma } from '../lib/prisma'
import Decimal from 'decimal.js'

/** Convertit une valeur Prisma Decimal ou primitive en number de manière sûre */
function toNumber(val: unknown): number {
  // RAISON: Prisma Decimal expose `.toNumber()` — cast nécessaire car `val` est `unknown`
  const obj = val as { toNumber?: () => number }
  if (obj && typeof obj.toNumber === 'function') {
    try { return obj.toNumber() } catch { /* fallthrough */ }
  }
  return Number(val ?? 0)
}

export async function getOrgStats(orgId: string, startDate?: Date, endDate?: Date) {
  const where: Record<string, unknown> = { organizationId: orgId }
  if (startDate) where.startTime = { gte: startDate }
  if (endDate) where.endTime = where.endTime ? { ...(where.endTime as object), lte: endDate } : { lte: endDate }

  // Only count completed appointments for revenue as per spec
  // NOTE: schema has no `status` field on Appointment; completion is derived by time/window.

  // Load related service prices and compute aggregates server-side (safe and explicit)
  const appointments = await prisma.appointment.findMany({ where, include: { service: { select: { price: true } } } })
  let total = new Decimal(0)
  for (const a of appointments) {
    const n = toNumber(a.service?.price ?? 0)
    total = total.plus(new Decimal(n))
  }

  const appointmentsCount = appointments.length

  // NOTE: `Customer.createdAt` does not exist in the Prisma schema; fallback to total customers.
  // If a createdAt field is added later, replace this by a date-scoped count per spec.
  const customersCount = await prisma.customer.count({ where: { organizationId: orgId } })

  // Basic occupancy: appointments per staff (caller may refine to time-window capacity)
  const staffCount = await prisma.staff.count({ where: { organizationId: orgId } })
  const occupancy = staffCount > 0 ? appointmentsCount / staffCount : 0

  return { totalRevenue: total.toString(), appointmentsCount, customersCount, staffCount, occupancy }
}

// getOrgDashboard: utilisé par test/analytics.service.spec.ts — à migrer vers dashboard.service.getDashboardForOrg
// TODO: supprimer après migration du test
const analyticsService = { getOrgStats }
export default analyticsService

export async function getOrgDashboard(orgId: string, startDate?: Date, endDate?: Date) {
  const now = new Date()
  const end = endDate ?? now
  const start = startDate ?? new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30)

  const where: Record<string, unknown> = { organizationId: orgId }
  where.startTime = { gte: start }
  where.endTime = { lte: end }

  const appointments = await prisma.appointment.findMany({ where, include: { service: { select: { price: true } } }, orderBy: { startTime: 'asc' } })

  let total = new Decimal(0)
  const map = new Map<string, { revenue: Decimal; count: number }>()

  for (const a of appointments) {
    const ad = new Date(a.startTime)
    const key = `${ad.getUTCFullYear()}-${String(ad.getUTCMonth() + 1).padStart(2, '0')}-${String(ad.getUTCDate()).padStart(2, '0')}`
    const cur = map.get(key) ?? { revenue: new Decimal(0), count: 0 }

    const n = toNumber(a.service?.price ?? 0)
    const dec = new Decimal(n)
    total = total.plus(dec)
    cur.revenue = cur.revenue.plus(dec)
    cur.count += 1
    map.set(key, cur)
  }

  const days: Date[] = []
  const msPerDay = 24 * 60 * 60 * 1000
  const startUTC = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())
  const endUTC = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate())
  for (let t = startUTC; t <= endUTC; t += msPerDay) days.push(new Date(t))

  const timeSeries = days.map(d => {
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
    const val = map.get(key) ?? { revenue: new Decimal(0), count: 0 }
    return { date: key, revenue: val.revenue.toNumber(), count: val.count }
  })

  const appointmentCount = appointments.length
  const newCustomerCount = await prisma.customer.count({ where: { organizationId: orgId } })

  return {
    summary: { totalRevenue: total.toNumber(), appointmentCount, newCustomerCount },
    timeSeries
  }
}






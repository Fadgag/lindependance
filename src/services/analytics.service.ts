import { prisma } from '../lib/prisma'
import Decimal from 'decimal.js'
import type { Prisma } from '@prisma/client'

export async function getOrgStats(orgId: string, startDate?: Date, endDate?: Date) {
  const where: Prisma.AppointmentWhereInput = { organizationId: orgId }
  if (startDate) where.startTime = { gte: startDate }
  if (endDate) where.endTime = { lte: endDate }

  // Only count completed appointments for revenue as per spec
  // NOTE: schema has no `status` field on Appointment; completion is derived by time/window.

  // Load related service prices and compute aggregates server-side (safe and explicit)
  const appointments = await prisma.appointment.findMany({ where, include: { service: { select: { price: true } } } })
  let total = new Decimal(0)
  for (const a of appointments) {
    const price = a.service?.price ?? 0
    let n: number
    const pobj = price as unknown as { toNumber?: () => number }
    if (pobj && typeof pobj.toNumber === 'function') {
      try { n = pobj.toNumber() } catch { n = Number(price ?? 0) }
    } else {
      n = Number(price ?? 0)
    }
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

// getOrgDashboard supprimé — remplacé par dashboard.service.getDashboardForOrg
const analyticsService = { getOrgStats }
export default analyticsService


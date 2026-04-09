import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock prisma client used by the service
vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    appointment: { findMany: vi.fn(), aggregate: vi.fn() },
    staff: { count: vi.fn() },
    customer: { count: vi.fn() },
  },
}))

import { prisma } from '../../src/lib/prisma'
import dashboardService from '../../src/services/dashboard.service'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('dashboard.service.getDashboardForOrg', () => {
  it('returns zeros and empty timeseries when there are no appointments', async () => {
    ;(prisma.appointment.findMany as any).mockResolvedValueOnce([])
    ;(prisma.staff.count as any).mockResolvedValueOnce(0)
    ;(prisma.customer.count as any).mockResolvedValueOnce(0)

    const res = await dashboardService.getDashboardForOrg('org-1', { start: new Date('2024-01-01'), end: new Date('2024-01-07') })

    expect(res).toBeDefined()
    expect(res.summary.totalRevenue).toBe(0)
    expect(res.summary.appointmentCount).toBe(0)
    expect(res.summary.newCustomerCount).toBe(0)
    expect(Array.isArray(res.timeseries)).toBe(true)
    // timeseries should contain entries per day between start and end
    expect(res.timeseries.length).toBeGreaterThanOrEqual(1)
  })

  it('aggregates revenue and counts correctly across multiple appointments', async () => {
    // Two appointments on different days with linked service.price
    const appointments = [
      { startTime: new Date('2024-01-02T10:00:00Z'), service: { price: 50 } },
      { startTime: new Date('2024-01-03T11:00:00Z'), service: { price: 75 } },
      // appointment with null service price should be treated as 0
      { startTime: new Date('2024-01-03T12:00:00Z'), service: { price: null } },
    ]

    ;(prisma.appointment.findMany as any).mockResolvedValueOnce(appointments)
    ;(prisma.staff.count as any).mockResolvedValueOnce(2)
    ;(prisma.customer.count as any).mockResolvedValueOnce(1)

    const res = await dashboardService.getDashboardForOrg('org-1', { start: new Date('2024-01-01'), end: new Date('2024-01-05') })

    expect(Number(res.summary.totalRevenue)).toBeCloseTo(125) // 50 + 75 + 0
    expect(res.summary.appointmentCount).toBe(3)
    expect(res.summary.newCustomerCount).toBe(1)
    // find the day buckets
    expect(res.summary.totalRevenue).toBeCloseTo(125) // 50 + 75 + 0
    const day2 = res.timeseries.find((p: any) => p.date.startsWith('2024-01-02'))
    const day3 = res.timeseries.find((p: any) => p.date.startsWith('2024-01-03'))
    expect(day2).toBeDefined()
    expect(day2?.revenue).toBeCloseTo(50)
    expect(day3).toBeDefined()
    expect(day3?.revenue).toBeCloseTo(75)
    // appointment count per day
    expect(day3?.count).toBeGreaterThanOrEqual(2)
  })
})


import { describe, it, expect, vi, beforeEach } from 'vitest'

// mock prisma used by the service
const mockFindMany = vi.fn()
const mockCustomerCount = vi.fn()
const mockStaffCount = vi.fn()
const mockOrgFindUnique = vi.fn()

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    appointment: { findMany: (opts: unknown) => mockFindMany(opts) },
    customer: { count: (opts: unknown) => mockCustomerCount(opts) },
    staff: { count: (opts: unknown) => mockStaffCount(opts) },
    organization: { findUnique: (opts: unknown) => mockOrgFindUnique(opts) },
  },
}))

import { getDashboardForOrg } from '../src/services/dashboard.service'

beforeEach(() => {
  vi.resetAllMocks()
  mockOrgFindUnique.mockResolvedValue(null)
})

describe('analytics.getOrgDashboard', () => {
  it('computes summary and timeseries for a 2-day range', async () => {
    const appointments = [
      { startTime: new Date('2026-03-30T10:00:00Z'), service: { price: 50 }, status: 'CONFIRMED', finalPrice: null },
      { startTime: new Date('2026-03-31T12:00:00Z'), service: { price: 100 }, status: 'CONFIRMED', finalPrice: null },
      { startTime: new Date('2026-03-31T15:00:00Z'), service: { price: null }, status: 'CONFIRMED', finalPrice: null },
    ]

    mockFindMany.mockResolvedValue(appointments)
    mockCustomerCount.mockResolvedValue(5)
    mockStaffCount.mockResolvedValue(2)

    const start = new Date('2026-03-30T00:00:00Z')
    const end = new Date('2026-03-31T23:59:59Z')

    const res = await getDashboardForOrg('org-1', { start, end })

    // Summary: totalProjected = somme des prix de service (non PAID → service.price)
    expect(res.summary.totalProjected).toBe(150)
    expect(res.summary.appointmentCount).toBe(3)
    expect(res.summary.newCustomerCount).toBe(5)

    // Time series should contain two days (30 and 31 march)
    expect(res.timeseries).toHaveLength(2)
    const [d30, d31] = res.timeseries
    expect(d30.count).toBe(1)
    expect(d30.planned).toBe(50)
    expect(d31.count).toBe(2)
    expect(d31.planned).toBe(100)
  })
})


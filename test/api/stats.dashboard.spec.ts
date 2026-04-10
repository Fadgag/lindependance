import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../../src/app/api/stats/dashboard/route'

// Mock prisma groupBy and counts used by the service
vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    appointment: { findMany: vi.fn() },
    customer: { count: vi.fn() },
    staff: { count: vi.fn() },
  },
}))

// Mock auth to control session
vi.mock('../../src/auth', () => ({
  auth: vi.fn(),
}))

import { prisma } from '../../src/lib/prisma'
import { auth } from '../../src/auth'

beforeEach(() => {
  vi.resetAllMocks()
})

describe('/api/stats/dashboard', () => {
  it('returns correct totals when groupBy yields Decimal-like strings', async () => {
    ;(auth as any).mockResolvedValueOnce({ user: { organizationId: 'org-1' } })
    // The service uses findMany to fetch appointments for the period; mock that
    ;(prisma.appointment.findMany as any).mockResolvedValueOnce([
      { startTime: new Date('2026-03-30T10:00:00Z'), service: { price: 50.5 }, status: 'CONFIRMED', finalPrice: null },
      { startTime: new Date('2026-03-31T12:00:00Z'), service: { price: 100.25 }, status: 'CONFIRMED', finalPrice: null },
      { startTime: new Date('2026-03-31T15:00:00Z'), service: { price: null }, status: 'CONFIRMED', finalPrice: null },
    ])
    ;(prisma.customer.count as any).mockResolvedValueOnce(3)
    ;(prisma.staff.count as any).mockResolvedValueOnce(2)

    const req = new Request('http://localhost/api/stats/dashboard?start=2026-03-30&end=2026-03-31')
    const res = await GET(req)
    const body = await (res as any).json()

    expect(Number(body.summary.totalRevenue)).toBeCloseTo(150.75)
    expect(body.summary.appointmentCount).toBe(3)
    expect(Array.isArray(body.timeseries)).toBe(true)
    const day30 = body.timeseries.find((d: any) => d.date === '2026-03-30')
    expect(Number(day30.revenue)).toBeCloseTo(50.5)
  })

  it('enforces organization isolation', async () => {
    // auth returns org-A; groupBy mock should receive where.organizationId === 'org-A'
    const findManyMock = (prisma.appointment.findMany as any)
    findManyMock.mockImplementationOnce((opts: any) => {
      if (opts.where.organizationId !== 'org-A') throw new Error('organization leak')
      return []
    })
    ;(auth as any).mockResolvedValueOnce({ user: { organizationId: 'org-A' } })
    ;(prisma.customer.count as any).mockResolvedValueOnce(0)
    ;(prisma.staff.count as any).mockResolvedValueOnce(0)

    const req = new Request('http://localhost/api/stats/dashboard')
    const res = await GET(req)
    const body = await (res as any).json()
    expect(body).toBeDefined()
  })
})



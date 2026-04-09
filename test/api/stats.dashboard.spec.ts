import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../../src/app/api/stats/dashboard/route'

// Mock prisma groupBy and counts used by the service
vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    appointment: { groupBy: vi.fn() },
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
    ;(prisma.appointment.groupBy as any).mockResolvedValueOnce([
      { startDate: '2026-03-30', _sum: { price: '50.5' }, _count: { _all: 1 } },
      { startDate: '2026-03-31', _sum: { price: '100.25' }, _count: { _all: 2 } },
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
    const groupByMock = (prisma.appointment.groupBy as any)
    groupByMock.mockImplementationOnce((opts: any) => {
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



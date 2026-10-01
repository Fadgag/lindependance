import { beforeEach, describe, expect, it, vi } from 'vitest'

const { authMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    organization: { findUnique: vi.fn() },
    appointment: { count: vi.fn() },
    appointmentChangeRequest: { count: vi.fn() },
  },
}))

vi.mock('@/auth', () => ({ auth: authMock }))
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))

import { GET } from '@/app/api/appointments/portal-count/route'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(auth).mockResolvedValue({
    user: { organizationId: 'org-1', accountType: 'STAFF' },
  } as never)
  vi.mocked(prisma.organization.findUnique).mockResolvedValue({ timezone: 'Europe/Paris' } as never)
  vi.mocked(prisma.appointment.count).mockResolvedValue(3)
  vi.mocked(prisma.appointmentChangeRequest.count).mockResolvedValue(2)
})

describe('GET /api/appointments/portal-count', () => {
  it('returns organization-scoped portal bookings and pending change requests', async () => {
    const response = await GET()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ count: 3, pendingChangeRequests: 2 })
    expect(prisma.appointment.count).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        organizationId: 'org-1',
        bookingSource: 'PORTAL',
      }),
    }))
    expect(prisma.appointmentChangeRequest.count).toHaveBeenCalledWith({
      where: {
        organizationId: 'org-1',
        status: 'PENDING',
        appointment: { is: { organizationId: 'org-1' } },
      },
    })
  })

  it('denies non-staff accounts', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { organizationId: 'org-1', accountType: 'CUSTOMER' },
    } as never)

    const response = await GET()

    expect(response.status).toBe(403)
    expect(prisma.appointment.count).not.toHaveBeenCalled()
  })
})

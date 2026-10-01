import { beforeEach, describe, expect, it, vi } from 'vitest'

const { portalServiceMock, appointmentsServiceMock } = vi.hoisted(() => ({
  portalServiceMock: { getCustomerPortalSession: vi.fn() },
  appointmentsServiceMock: {
    getCustomerPortalAppointments: vi.fn(),
    cancelCustomerPortalAppointment: vi.fn(),
  },
}))

vi.mock('@/services/customerPortal.service', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/services/customerPortal.service')>(),
  ...portalServiceMock,
}))
vi.mock('@/services/customerPortalAppointments.service', () => appointmentsServiceMock)

import { GET } from '@/app/api/portail/rdv/route'
import { DELETE } from '@/app/api/portail/rdv/[id]/route'
import { getCustomerPortalSession } from '@/services/customerPortal.service'
import {
  cancelCustomerPortalAppointment,
  getCustomerPortalAppointments,
} from '@/services/customerPortalAppointments.service'

const session = {
  accountType: 'CUSTOMER' as const,
  organizationId: 'org-1',
  verifiedEmail: 'parent@example.com',
  expiresAt: Date.now() + 60_000,
}
const routeContext = { params: Promise.resolve({ id: 'appointment-1' }) }

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(getCustomerPortalSession).mockReturnValue(session)
  vi.mocked(getCustomerPortalAppointments).mockResolvedValue({
    timezone: 'Europe/Paris',
    appointments: [{
      id: 'appointment-1',
      startTime: new Date('2026-10-03T10:00:00.000Z'),
      endTime: new Date('2026-10-03T11:00:00.000Z'),
      status: 'CONFIRMED',
      serviceId: 'service-1',
      staffId: 'staff-1',
      customer: { firstName: 'Camille', lastName: 'Martin' },
      service: { name: 'Coupe' },
      staff: { firstName: 'Alex', lastName: 'Durand' },
      canCancel: true,
      changeRequest: null,
    }],
  })
})

describe('GET /api/portail/rdv', () => {
  it('returns a strict customer appointment projection scoped to session identity', async () => {
    const response = await GET(new Request('https://example.test/api/portail/rdv?customerId=other-customer'))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      timezone: 'Europe/Paris',
      appointments: [{
        id: 'appointment-1',
        startTime: '2026-10-03T10:00:00.000Z',
        endTime: '2026-10-03T11:00:00.000Z',
        status: 'CONFIRMED',
        serviceId: 'service-1',
        staffId: 'staff-1',
        customer: { firstName: 'Camille', lastName: 'Martin' },
        service: { name: 'Coupe' },
        staff: { firstName: 'Alex', lastName: 'Durand' },
        canCancel: true,
        changeRequest: null,
      }],
    })
    expect(getCustomerPortalAppointments).toHaveBeenCalledWith({
      organizationId: 'org-1',
      verifiedEmail: 'parent@example.com',
    })
  })

  it('requires a customer-only session', async () => {
    vi.mocked(getCustomerPortalSession).mockReturnValueOnce(null)

    const response = await GET(new Request('https://example.test/api/portail/rdv'))

    expect(response.status).toBe(401)
    expect(getCustomerPortalAppointments).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/portail/rdv/[id]', () => {
  it('cancels only the requested appointment using session identity', async () => {
    const response = await DELETE(
      new Request('https://example.test/api/portail/rdv/appointment-1', { method: 'DELETE' }),
      routeContext,
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    expect(cancelCustomerPortalAppointment).toHaveBeenCalledWith({
      appointmentId: 'appointment-1',
      organizationId: 'org-1',
      verifiedEmail: 'parent@example.com',
    })
  })

  it('rejects cross-origin requests before cancellation', async () => {
    const response = await DELETE(
      new Request('https://example.test/api/portail/rdv/appointment-1', {
        method: 'DELETE',
        headers: { origin: 'https://attacker.example' },
      }),
      routeContext,
    )

    expect(response.status).toBe(403)
    expect(cancelCustomerPortalAppointment).not.toHaveBeenCalled()
  })

  it('requires a customer-only session', async () => {
    vi.mocked(getCustomerPortalSession).mockReturnValueOnce(null)

    const response = await DELETE(
      new Request('https://example.test/api/portail/rdv/appointment-1', { method: 'DELETE' }),
      routeContext,
    )

    expect(response.status).toBe(401)
    expect(cancelCustomerPortalAppointment).not.toHaveBeenCalled()
  })
})

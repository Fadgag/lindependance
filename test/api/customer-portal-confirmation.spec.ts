import { beforeEach, describe, expect, it, vi } from 'vitest'

const { portalServiceMock, bookingServiceMock, emailServiceMock, loggerMock } = vi.hoisted(() => ({
  portalServiceMock: { getCustomerPortalSession: vi.fn() },
  bookingServiceMock: { getAppointmentConfirmationForCustomer: vi.fn() },
  emailServiceMock: { sendAppointmentConfirmation: vi.fn() },
  loggerMock: { error: vi.fn() },
}))

vi.mock('@/services/customerPortal.service', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/services/customerPortal.service')>(),
  ...portalServiceMock,
}))
vi.mock('@/services/customerPortalBooking.service', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/services/customerPortalBooking.service')>(),
  ...bookingServiceMock,
}))
vi.mock('@/services/customerPortalEmail.service', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/services/customerPortalEmail.service')>(),
  ...emailServiceMock,
}))
vi.mock('@/lib/logger', () => ({ logger: loggerMock }))

import { POST } from '@/app/api/portail/rdv/[id]/confirmation/route'
import { getCustomerPortalSession } from '@/services/customerPortal.service'
import { CustomerPortalHttpError } from '@/services/customerPortal.service'
import { getAppointmentConfirmationForCustomer } from '@/services/customerPortalBooking.service'
import { sendAppointmentConfirmation } from '@/services/customerPortalEmail.service'

const session = {
  accountType: 'CUSTOMER' as const,
  organizationId: 'org-1',
  verifiedEmail: 'parent@example.com',
  expiresAt: Date.now() + 60_000,
}
const confirmation = {
  email: 'parent@example.com',
  organizationSlug: 'atelier',
  appointment: {
    id: 'appointment-1',
    startTime: new Date('2026-10-01T08:00:00.000Z'),
    endTime: new Date('2026-10-01T09:00:00.000Z'),
    createdAt: new Date('2026-09-30T12:00:00.000Z'),
    serviceName: 'Coupe',
    organizationName: 'Atelier',
    timezone: 'Europe/Paris',
    portalUrl: 'https://example.test/portail/atelier/reserver',
  },
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(getCustomerPortalSession).mockResolvedValue(session)
  vi.mocked(getAppointmentConfirmationForCustomer).mockResolvedValue(confirmation)
  vi.mocked(sendAppointmentConfirmation).mockResolvedValue(undefined)
})

describe('POST /api/portail/rdv/[id]/confirmation', () => {
  it('re-sends from the persisted appointment and never creates another booking', async () => {
    const response = await POST(
      new Request('https://example.test/api/portail/rdv/appointment-1/confirmation', { method: 'POST' }),
      { params: Promise.resolve({ id: 'appointment-1' }) },
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    expect(getAppointmentConfirmationForCustomer).toHaveBeenCalledWith({
      appointmentId: 'appointment-1',
      organizationId: 'org-1',
      verifiedEmail: 'parent@example.com',
    })
    expect(sendAppointmentConfirmation).toHaveBeenCalledOnce()
  })

  it('does not send a confirmation for appointments outside the verified customer scope', async () => {
    vi.mocked(getAppointmentConfirmationForCustomer).mockRejectedValueOnce(
      new CustomerPortalHttpError(404, 'Not found'),
    )

    const response = await POST(
      new Request('https://example.test/api/portail/rdv/appointment-1/confirmation', { method: 'POST' }),
      { params: Promise.resolve({ id: 'appointment-1' }) },
    )

    expect(response.status).toBe(404)
    expect(sendAppointmentConfirmation).not.toHaveBeenCalled()
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { portalServiceMock, bookingServiceMock, emailServiceMock, loggerMock } = vi.hoisted(() => ({
  portalServiceMock: { getCustomerPortalSession: vi.fn() },
  bookingServiceMock: { createCustomerPortalAppointment: vi.fn() },
  emailServiceMock: { sendAppointmentConfirmation: vi.fn() },
  loggerMock: { error: vi.fn() },
}))

vi.mock('@/services/customerPortal.service', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/services/customerPortal.service')>(),
  ...portalServiceMock,
}))
vi.mock('@/services/customerPortalBooking.service', () => bookingServiceMock)
vi.mock('@/services/customerPortalEmail.service', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/services/customerPortalEmail.service')>(),
  ...emailServiceMock,
}))
vi.mock('@/lib/logger', () => ({ logger: loggerMock }))

import { POST } from '@/app/api/portail/rdv/route'
import { getCustomerPortalSession } from '@/services/customerPortal.service'
import { createCustomerPortalAppointment } from '@/services/customerPortalBooking.service'
import { sendAppointmentConfirmation } from '@/services/customerPortalEmail.service'

const session = {
  accountType: 'CUSTOMER' as const,
  organizationId: 'org-1',
  verifiedEmail: 'parent@example.com',
  expiresAt: Date.now() + 60_000,
}
const created = {
  appointment: {
    id: 'appointment-1',
    startTime: new Date('2026-10-01T08:00:00.000Z'),
    endTime: new Date('2026-10-01T09:00:00.000Z'),
    createdAt: new Date('2026-09-30T12:00:00.000Z'),
  },
  serviceName: 'Coupe',
  organizationName: 'Atelier',
  organizationSlug: 'atelier',
  timezone: 'Europe/Paris',
  email: 'parent@example.com',
}

function request(body: Record<string, unknown>) {
  return new Request('https://example.test/api/portail/rdv', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: 'customer_portal_session=signed' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(getCustomerPortalSession).mockReturnValue(session)
  vi.mocked(createCustomerPortalAppointment).mockResolvedValue(created)
  vi.mocked(sendAppointmentConfirmation).mockResolvedValue(undefined)
})

describe('POST /api/portail/rdv', () => {
  it('creates from session identity and keeps the booking when confirmation email fails', async () => {
    vi.mocked(sendAppointmentConfirmation).mockRejectedValueOnce(new Error('provider unavailable'))

    const response = await POST(request({
      customerId: 'customer-1',
      serviceId: 'service-1',
      start: '2026-10-01T08:00:00.000Z',
    }))

    expect(response.status).toBe(201)
    expect(await response.json()).toMatchObject({
      appointment: { id: 'appointment-1' },
      emailSent: false,
    })
    expect(createCustomerPortalAppointment).toHaveBeenCalledWith({
      organizationId: 'org-1',
      verifiedEmail: 'parent@example.com',
      customerId: 'customer-1',
      serviceId: 'service-1',
      staffId: undefined,
      start: '2026-10-01T08:00:00.000Z',
    })
    expect(loggerMock.error).toHaveBeenCalledOnce()
  })

  it('rejects client-supplied duration, price, end time, or organization id', async () => {
    const response = await POST(request({
      customerId: 'customer-1',
      serviceId: 'service-1',
      start: '2026-10-01T08:00:00.000Z',
      duration: 60,
      organizationId: 'forged-org',
    }))

    expect(response.status).toBe(400)
    expect(createCustomerPortalAppointment).not.toHaveBeenCalled()
  })

  it('requires a customer-only session', async () => {
    vi.mocked(getCustomerPortalSession).mockReturnValueOnce(null)

    const response = await POST(request({
      customerId: 'customer-1',
      serviceId: 'service-1',
      start: '2026-10-01T08:00:00.000Z',
    }))

    expect(response.status).toBe(401)
    expect(createCustomerPortalAppointment).not.toHaveBeenCalled()
  })
})

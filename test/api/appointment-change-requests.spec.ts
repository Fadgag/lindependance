import { beforeEach, describe, expect, it, vi } from 'vitest'

const { authMock, changeRequestsServiceMock, notificationServiceMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  changeRequestsServiceMock: {
    getPendingAppointmentChangeRequests: vi.fn(),
    approveAppointmentChangeRequest: vi.fn(),
    rejectAppointmentChangeRequest: vi.fn(),
  },
  notificationServiceMock: {
    sendAppointmentChangeDecisionNotification: vi.fn(),
  },
}))

vi.mock('@/auth', () => ({ auth: authMock }))
vi.mock('@/services/appointmentChangeRequests.service', () => changeRequestsServiceMock)
vi.mock('@/services/appointmentChangeNotification.service', () => notificationServiceMock)

import { GET } from '@/app/api/appointments/change-requests/route'
import { POST as approve } from '@/app/api/appointments/change-requests/[id]/approve/route'
import { POST as reject } from '@/app/api/appointments/change-requests/[id]/reject/route'
import { auth } from '@/auth'
import {
  approveAppointmentChangeRequest,
  getPendingAppointmentChangeRequests,
  rejectAppointmentChangeRequest,
} from '@/services/appointmentChangeRequests.service'
import { sendAppointmentChangeDecisionNotification } from '@/services/appointmentChangeNotification.service'
import {
  CustomerPortalHttpError,
  SerializableConflictError,
} from '@/services/customerPortal.service'

const staffSession = {
  user: {
    id: 'staff-user-1',
    organizationId: 'org-1',
    accountType: 'STAFF',
  },
}
const context = { params: Promise.resolve({ id: 'request-1' }) }
const decision = {
  requestId: 'request-1',
  organizationId: 'org-1',
  verifiedEmail: 'verified@example.test',
  decision: 'APPROVED' as const,
  reviewReason: null,
  organizationName: 'Atelier',
  organizationSlug: 'atelier',
  timezone: 'Europe/Paris',
  appointment: {
    id: 'appointment-1',
    startTime: new Date('2026-10-04T08:30:00.000Z'),
    endTime: new Date('2026-10-04T09:30:00.000Z'),
    createdAt: new Date('2026-09-30T12:00:00.000Z'),
    lastModified: new Date('2026-10-01T08:00:00.000Z'),
    calendarSequence: 1,
    serviceName: 'Coupe',
  },
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(auth).mockResolvedValue(staffSession as never)
  vi.mocked(getPendingAppointmentChangeRequests).mockResolvedValue({
    timezone: 'Europe/Paris',
    requests: [],
  })
  vi.mocked(approveAppointmentChangeRequest).mockResolvedValue(decision)
  vi.mocked(rejectAppointmentChangeRequest).mockResolvedValue({ ...decision, decision: 'REJECTED' })
  vi.mocked(sendAppointmentChangeDecisionNotification).mockResolvedValue({ notificationSent: true })
})

describe('staff appointment change-request endpoints', () => {
  it('returns pending requests scoped to the authenticated staff organization', async () => {
    const response = await GET()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ timezone: 'Europe/Paris', requests: [] })
    expect(getPendingAppointmentChangeRequests).toHaveBeenCalledWith({ organizationId: 'org-1' })
  })

  it('requires a staff account for all review actions', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: 'customer-1', organizationId: 'org-1', accountType: 'CUSTOMER' },
    } as never)
    const response = await approve(new Request('https://example.test', { method: 'POST' }), context)
    expect(response.status).toBe(403)
    expect(approveAppointmentChangeRequest).not.toHaveBeenCalled()
  })

  it('notifies after recording approvals and rejections', async () => {
    const approved = await approve(
      new Request('https://example.test', { method: 'POST' }),
      context,
    )
    expect(approved.status).toBe(200)
    expect(await approved.json()).toEqual({ ok: true, notificationSent: true })
    expect(approveAppointmentChangeRequest).toHaveBeenCalledWith({
      requestId: 'request-1',
      organizationId: 'org-1',
      reviewerId: 'staff-user-1',
    })
    expect(sendAppointmentChangeDecisionNotification).toHaveBeenCalledWith({
      decision,
      requestOrigin: 'https://example.test',
    })

    const rejected = await reject(new Request('https://example.test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewReason: 'Créneau non disponible' }),
    }), context)
    expect(rejected.status).toBe(200)
    expect(await rejected.json()).toEqual({ ok: true, notificationSent: true })
    expect(rejectAppointmentChangeRequest).toHaveBeenCalledWith({
      requestId: 'request-1',
      organizationId: 'org-1',
      reviewerId: 'staff-user-1',
      reviewReason: 'Créneau non disponible',
    })
    expect(sendAppointmentChangeDecisionNotification).toHaveBeenLastCalledWith({
      decision: { ...decision, decision: 'REJECTED' },
      requestOrigin: 'https://example.test',
    })
  })

  it('returns a warning when the decision was saved but its email could not be sent', async () => {
    vi.mocked(sendAppointmentChangeDecisionNotification).mockResolvedValueOnce({
      notificationSent: false,
      notificationWarning: 'La décision a été enregistrée, mais l’e-mail n’a pas pu être envoyé.',
    })

    const response = await approve(
      new Request('https://example.test', { method: 'POST' }),
      context,
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      ok: true,
      notificationSent: false,
      notificationWarning: 'La décision a été enregistrée, mais l’e-mail n’a pas pu être envoyé.',
    })
  })

  it('does not send a notification when the decision is rejected', async () => {
    vi.mocked(approveAppointmentChangeRequest).mockRejectedValueOnce(
      new CustomerPortalHttpError(409, 'Le créneau demandé n’est plus disponible.'),
    )

    const response = await approve(
      new Request('https://example.test', { method: 'POST' }),
      context,
    )

    expect(response.status).toBe(409)
    expect(sendAppointmentChangeDecisionNotification).not.toHaveBeenCalled()
  })

  it('returns a retryable conflict when rejecting encounters a serialization conflict', async () => {
    vi.mocked(rejectAppointmentChangeRequest).mockRejectedValueOnce(
      new SerializableConflictError(),
    )

    const response = await reject(
      new Request('https://example.test', { method: 'POST' }),
      context,
    )

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({ error: 'Conflit lors du traitement, réessayez.' })
    expect(sendAppointmentChangeDecisionNotification).not.toHaveBeenCalled()
  })
})

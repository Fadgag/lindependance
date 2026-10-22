import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { sendEmailMock, loggerErrorMock } = vi.hoisted(() => ({
  sendEmailMock: vi.fn(),
  loggerErrorMock: vi.fn(),
}))

vi.mock('@/services/customerPortalEmail.service', () => ({
  sendAppointmentChangeDecisionEmail: sendEmailMock,
}))
vi.mock('@/lib/logger', () => ({
  logger: { error: loggerErrorMock },
}))

import { sendAppointmentChangeDecisionNotification } from '@/services/appointmentChangeNotification.service'

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
    calendarSequence: 2,
    serviceName: 'Coupe',
  },
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.example.test')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('sendAppointmentChangeDecisionNotification', () => {
  it('sends the decision to the verified email and builds the updated portal calendar details', async () => {
    const result = await sendAppointmentChangeDecisionNotification({
      decision,
      requestOrigin: 'https://request.example.test',
    })

    expect(result).toEqual({ notificationSent: true })
    expect(sendEmailMock).toHaveBeenCalledWith({
      to: 'verified@example.test',
      decision: 'APPROVED',
      reviewReason: null,
      appointment: {
        id: 'appointment-1',
        startTime: new Date('2026-10-04T08:30:00.000Z'),
        endTime: new Date('2026-10-04T09:30:00.000Z'),
        createdAt: new Date('2026-09-30T12:00:00.000Z'),
        lastModified: new Date('2026-10-01T08:00:00.000Z'),
        sequence: 2,
        serviceName: 'Coupe',
        organizationName: 'Atelier',
        timezone: 'Europe/Paris',
        portalUrl: 'https://app.example.test/portail/atelier/mes-rdv',
      },
    })
  })

  it('does not send a decision email when an older request has no verified address snapshot', async () => {
    const result = await sendAppointmentChangeDecisionNotification({
      decision: { ...decision, verifiedEmail: null },
      requestOrigin: 'https://request.example.test',
    })

    expect(result).toEqual({
      notificationSent: false,
      notificationWarning: 'La décision a été enregistrée, mais aucune adresse e-mail vérifiée n’est disponible.',
    })
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('reports an email failure without changing the recorded decision', async () => {
    sendEmailMock.mockRejectedValueOnce(new Error('Resend unavailable'))

    const result = await sendAppointmentChangeDecisionNotification({
      decision,
      requestOrigin: 'https://request.example.test',
    })

    expect(result).toEqual({
      notificationSent: false,
      notificationWarning: 'La décision a été enregistrée, mais l’e-mail de notification n’a pas pu être envoyé.',
    })
    expect(loggerErrorMock).toHaveBeenCalledWith(
      'Appointment change decision email failed',
      { organizationId: 'org-1', requestId: 'request-1', error: expect.any(Error) },
    )
  })
})

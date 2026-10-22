import { logger } from '@/lib/logger'
import type { AppointmentChangeDecisionNotification } from '@/services/appointmentChangeRequests.service'
import { sendAppointmentChangeDecisionEmail } from '@/services/customerPortalEmail.service'

export type AppointmentChangeNotificationResult =
  | { notificationSent: true }
  | { notificationSent: false; notificationWarning: string }

export async function sendAppointmentChangeDecisionNotification(input: {
  decision: AppointmentChangeDecisionNotification
  requestOrigin: string
}): Promise<AppointmentChangeNotificationResult> {
  const decision = input.decision
  if (!decision.verifiedEmail) {
    return {
      notificationSent: false,
      notificationWarning: 'La décision a été enregistrée, mais aucune adresse e-mail vérifiée n’est disponible.',
    }
  }

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL
    ?? process.env.NEXTAUTH_URL
    ?? input.requestOrigin).replace(/\/+$/, '')
  const portalPath = decision.organizationSlug
    ? `/portail/${encodeURIComponent(decision.organizationSlug)}/mes-rdv`
    : '/'
  const { calendarSequence, ...appointment } = decision.appointment

  try {
    await sendAppointmentChangeDecisionEmail({
      to: decision.verifiedEmail,
      decision: decision.decision,
      reviewReason: decision.reviewReason,
      appointment: {
        ...appointment,
        sequence: calendarSequence,
        organizationName: decision.organizationName,
        timezone: decision.timezone,
        portalUrl: `${baseUrl}${portalPath}`,
      },
    })
    return { notificationSent: true }
  } catch (error: unknown) {
    logger.error('Appointment change decision email failed', {
      organizationId: decision.organizationId,
      requestId: decision.requestId,
      error,
    })
    return {
      notificationSent: false,
      notificationWarning: 'La décision a été enregistrée, mais l’e-mail de notification n’a pas pu être envoyé.',
    }
  }
}

import { Resend } from 'resend'

export interface AppointmentConfirmation {
  id: string
  startTime: Date
  endTime: Date
  createdAt: Date
  serviceName: string
  organizationName: string
  timezone: string
  portalUrl: string
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

function formatUtcDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function createAppointmentIcs(appointment: AppointmentConfirmation): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Independance//Customer Portal//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    `X-WR-TIMEZONE:${escapeIcsText(appointment.timezone)}`,
    'BEGIN:VEVENT',
    `UID:${escapeIcsText(appointment.id)}@customer-portal`,
    `DTSTAMP:${formatUtcDate(appointment.createdAt)}`,
    `DTSTART:${formatUtcDate(appointment.startTime)}`,
    `DTEND:${formatUtcDate(appointment.endTime)}`,
    `SUMMARY:${escapeIcsText(appointment.serviceName)}`,
    `DESCRIPTION:${escapeIcsText(`Rendez-vous chez ${appointment.organizationName}. Fuseau horaire : ${appointment.timezone}.`)}`,
    `URL:${appointment.portalUrl.replace(/[\r\n]/g, '')}`,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ]
  return lines.join('\r\n')
}

export async function sendCustomerPortalOtpEmail(input: {
  to: string
  code: string
  organizationName: string
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured')
  const result = await new Resend(apiKey).emails.send({
    from: process.env.RESEND_FROM || 'no-reply@studio.test',
    to: input.to,
    subject: `Votre code de connexion à ${input.organizationName}`,
    html: [
      '<div style="font-family:system-ui,sans-serif;line-height:1.6">',
      `<h2>Connexion au portail de ${escapeHtml(input.organizationName)}</h2>`,
      `<p>Votre code de connexion est <strong>${escapeHtml(input.code)}</strong>.</p>`,
      '<p>Ce code est à usage unique et expire dans 10 minutes.</p>',
      '</div>',
    ].join(''),
  })

  if (result.error) throw new Error(`Resend failed to send customer portal OTP: ${result.error.message}`)
}

export async function sendAppointmentConfirmation(input: {
  to: string
  appointment: AppointmentConfirmation
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured')

  const appointment = input.appointment
  const localizedDate = new Intl.DateTimeFormat('fr-FR', {
    timeZone: appointment.timezone,
    dateStyle: 'full',
  }).format(appointment.startTime)
  const localizedStart = new Intl.DateTimeFormat('fr-FR', {
    timeZone: appointment.timezone,
    hour: '2-digit',
    minute: '2-digit',
  }).format(appointment.startTime)
  const localizedEnd = new Intl.DateTimeFormat('fr-FR', {
    timeZone: appointment.timezone,
    hour: '2-digit',
    minute: '2-digit',
  }).format(appointment.endTime)

  const result = await new Resend(apiKey).emails.send({
    from: process.env.RESEND_FROM || 'no-reply@studio.test',
    to: input.to,
    subject: `Confirmation de votre rendez-vous chez ${appointment.organizationName}`,
    html: [
      '<div style="font-family:system-ui,sans-serif;line-height:1.6">',
      `<h2>Votre rendez-vous chez ${escapeHtml(appointment.organizationName)} est confirmé</h2>`,
      `<p><strong>Prestation :</strong> ${escapeHtml(appointment.serviceName)}</p>`,
      `<p><strong>Date :</strong> ${escapeHtml(localizedDate)}</p>`,
      `<p><strong>Horaire :</strong> ${escapeHtml(localizedStart)}–${escapeHtml(localizedEnd)} (${escapeHtml(appointment.timezone)})</p>`,
      `<p><a href="${escapeHtml(appointment.portalUrl)}">Consulter le portail</a></p>`,
      '</div>',
    ].join(''),
    attachments: [{
      filename: 'rendez-vous.ics',
      content: Buffer.from(createAppointmentIcs(appointment)),
    }],
  })

  if (result.error) throw new Error(`Resend failed to send appointment confirmation: ${result.error.message}`)
}

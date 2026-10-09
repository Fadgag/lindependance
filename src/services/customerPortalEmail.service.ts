import { Resend } from 'resend'
import { renderCustomerPortalEmailTemplate } from '@/domain/customer-portal/emailTemplates'

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

function renderPlainTextEmail(value: string): string {
  return `<div style="font-family:system-ui,sans-serif;line-height:1.6">${escapeHtml(value).replace(/\r\n?/g, '\n').replace(/\n/g, '<br>')}</div>`
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
  template: string | null
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured')
  const result = await new Resend(apiKey).emails.send({
    from: process.env.RESEND_FROM || 'no-reply@studio.test',
    to: input.to,
    subject: `Votre code de connexion à ${input.organizationName}`,
    html: renderPlainTextEmail(renderCustomerPortalEmailTemplate(input.template, 'otp', {
      organizationName: input.organizationName,
      code: input.code,
    })),
  })

  if (result.error) throw new Error(`Resend failed to send customer portal OTP: ${result.error.message}`)
}

export async function sendCustomerPortalSavedEmail(input: {
  to: string
  organizationName: string
  portalUrl: string
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured')

  const organizationName = escapeHtml(input.organizationName)
  const portalUrl = escapeHtml(input.portalUrl)
  const result = await new Resend(apiKey).emails.send({
    from: process.env.RESEND_FROM || 'no-reply@studio.test',
    to: input.to,
    subject: `Votre adresse e-mail pour réserver chez ${input.organizationName.replace(/[\r\n]/g, ' ')}`,
    html: [
      '<div style="font-family:system-ui,sans-serif;line-height:1.6">',
      '<p>Bonjour,</p>',
      `<p>Cette adresse e-mail est bien enregistrée dans votre fiche client chez ${organizationName}.</p>`,
      '<p>Pour prendre vos rendez-vous en ligne, utilisez cette adresse e-mail.</p>',
      '<p>Merci de confirmer au personnel du salon que vous avez bien reçu ce message.</p>',
      `<p><a href="${portalUrl}" style="display:inline-block;padding:12px 18px;background:#3730a3;color:#fff;text-decoration:none;border-radius:8px">Réserver en ligne</a></p>`,
      `<p>À bientôt,<br>${organizationName}</p>`,
      '</div>',
    ].join(''),
  })

  if (result.error) throw new Error(`Resend failed to send customer saved email: ${result.error.message}`)
}

export async function sendCustomerPortalDisabledEmail(input: {
  to: string
  organizationName: string
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured')

  const result = await new Resend(apiKey).emails.send({
    from: process.env.RESEND_FROM || 'no-reply@studio.test',
    to: input.to,
    subject: `Portail client désactivé pour ${input.organizationName}`,
    html: [
      '<div style="font-family:system-ui,sans-serif;line-height:1.6">',
      `<h2>Le portail client de ${escapeHtml(input.organizationName)} a été désactivé</h2>`,
      '<p>Aucun praticien actif n’est actuellement configuré.</p>',
      '<p>Après avoir ajouté ou réactivé un praticien, un administrateur peut réactiver le portail depuis Configuration → Portail.</p>',
      '</div>',
    ].join(''),
  })

  if (result.error) throw new Error(`Resend failed to send portal disabled notification: ${result.error.message}`)
}

export async function sendAppointmentConfirmation(input: {
  to: string
  appointment: AppointmentConfirmation
  template: string | null
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
    html: renderPlainTextEmail(renderCustomerPortalEmailTemplate(input.template, 'appointmentConfirmation', {
      organizationName: appointment.organizationName,
      serviceName: appointment.serviceName,
      date: localizedDate,
      startTime: localizedStart,
      endTime: localizedEnd,
      timezone: appointment.timezone,
      portalUrl: appointment.portalUrl,
    })),
    attachments: [{
      filename: 'rendez-vous.ics',
      content: Buffer.from(createAppointmentIcs(appointment)),
    }],
  })

  if (result.error) throw new Error(`Resend failed to send appointment confirmation: ${result.error.message}`)
}

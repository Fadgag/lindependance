export type CustomerPortalEmailTemplateType = 'otp' | 'appointmentConfirmation'

export const CUSTOMER_PORTAL_EMAIL_TEMPLATE_DEFAULTS = {
  otp: 'Connexion au portail de {{organizationName}}\n\nVotre code de connexion est : {{code}}\nCe code à usage unique expire dans 10 minutes.',
  appointmentConfirmation: 'Votre rendez-vous chez {{organizationName}} est confirmé.\n\nPrestation : {{serviceName}}\nDate : {{date}}\nHoraire : {{startTime}}–{{endTime}} ({{timezone}})\n\nConsulter le portail : {{portalUrl}}',
} as const

const allowedVariables: Record<CustomerPortalEmailTemplateType, readonly string[]> = {
  otp: ['organizationName', 'code'],
  appointmentConfirmation: [
    'organizationName',
    'serviceName',
    'date',
    'startTime',
    'endTime',
    'timezone',
    'portalUrl',
  ],
}

const requiredVariables: Record<CustomerPortalEmailTemplateType, readonly string[]> = {
  otp: ['code'],
  appointmentConfirmation: ['serviceName', 'date', 'startTime', 'endTime'],
}

export function isCustomerPortalEmailTemplateValid(
  template: string | null,
  type: CustomerPortalEmailTemplateType,
): boolean {
  if (template === null) return true
  if (!template.trim()) return false

  const tokens = Array.from(template.matchAll(/\{\{([A-Za-z][A-Za-z0-9]*)\}\}/g), (match) => match[1])
  const withoutTokens = template.replace(/\{\{[A-Za-z][A-Za-z0-9]*\}\}/g, '')
  if (withoutTokens.includes('{{') || withoutTokens.includes('}}')) return false
  if (tokens.some((token) => !allowedVariables[type].includes(token))) return false
  return requiredVariables[type].every((token) => tokens.includes(token))
}

export function renderCustomerPortalEmailTemplate(
  template: string | null,
  type: CustomerPortalEmailTemplateType,
  values: Readonly<Record<string, string>>,
): string {
  const source = template?.trim() ? template : CUSTOMER_PORTAL_EMAIL_TEMPLATE_DEFAULTS[type]
  return source.replace(/\{\{([A-Za-z][A-Za-z0-9]*)\}\}/g, (token, key: string) => {
    const value = values[key]
    if (value === undefined) {
      throw new Error(`Missing customer portal email template value: ${key}`)
    }
    return value
  })
}

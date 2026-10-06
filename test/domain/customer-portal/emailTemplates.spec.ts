import { describe, expect, it } from 'vitest'
import {
  CUSTOMER_PORTAL_EMAIL_TEMPLATE_DEFAULTS,
  isCustomerPortalEmailTemplateValid,
  renderCustomerPortalEmailTemplate,
} from '@/domain/customer-portal/emailTemplates'

describe('customer portal email templates', () => {
  it('uses the built-in OTP message when no custom template is configured', () => {
    expect(renderCustomerPortalEmailTemplate(null, 'otp', {
      organizationName: 'Atelier',
      code: '123456',
    })).toBe(CUSTOMER_PORTAL_EMAIL_TEMPLATE_DEFAULTS.otp
      .replace('{{organizationName}}', 'Atelier')
      .replace('{{code}}', '123456'))
  })

  it('renders supported appointment variables in a custom template', () => {
    expect(renderCustomerPortalEmailTemplate(
      'Chez {{organizationName}} : {{serviceName}}, le {{date}} de {{startTime}} à {{endTime}} ({{timezone}}). {{portalUrl}}',
      'appointmentConfirmation',
      {
        organizationName: 'Atelier',
        serviceName: 'Coupe',
        date: 'mardi 6 octobre',
        startTime: '10:00',
        endTime: '11:00',
        timezone: 'Europe/Paris',
        portalUrl: 'https://example.test/portail/atelier',
      },
    )).toBe('Chez Atelier : Coupe, le mardi 6 octobre de 10:00 à 11:00 (Europe/Paris). https://example.test/portail/atelier')
  })

  it('requires essential variables and rejects unsupported variables', () => {
    expect(isCustomerPortalEmailTemplateValid('Votre code : {{code}}', 'otp')).toBe(true)
    expect(isCustomerPortalEmailTemplateValid('Votre code de connexion', 'otp')).toBe(false)
    expect(isCustomerPortalEmailTemplateValid('Votre code : {{unknown}} {{code}}', 'otp')).toBe(false)
    expect(isCustomerPortalEmailTemplateValid(
      'Rendez-vous {{serviceName}} le {{date}} à {{startTime}}-{{endTime}}',
      'appointmentConfirmation',
    )).toBe(true)
    expect(isCustomerPortalEmailTemplateValid(
      'Rendez-vous {{serviceName}} à {{startTime}}',
      'appointmentConfirmation',
    )).toBe(false)
  })

  it('treats an empty configured template as invalid so callers can normalize it to the default', () => {
    expect(isCustomerPortalEmailTemplateValid('', 'otp')).toBe(false)
    expect(isCustomerPortalEmailTemplateValid('Code {{code}} et {{unfinished', 'otp')).toBe(false)
  })
})

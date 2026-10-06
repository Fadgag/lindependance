import { describe, expect, it } from 'vitest'
import { CustomerCreateSchema, CustomerUpdateSchema } from '@/schemas/customers'
import {
  CustomerPortalBookingSchema,
  CustomerPortalSettingsSchema,
  CustomerPortalDateSchema,
  CustomerPortalOtpRequestSchema,
  CustomerPortalOtpVerificationSchema,
} from '@/schemas/customerPortal'

describe('customer portal staff-managed contact email', () => {
  it('accepts and normalizes an optional portal email on customer creation', () => {
    expect(CustomerCreateSchema.parse({
      firstName: 'Camille',
      lastName: 'Martin',
      email: ' Parent@Example.com ',
    }).email).toBe('parent@example.com')
  })

  it('accepts explicit removal of an email on customer update', () => {
    expect(CustomerUpdateSchema.parse({ id: 'customer-1', email: null }).email).toBeNull()
  })
})

describe('customer portal request schemas', () => {
  it('requires a slug and valid timezone when activating a portal', () => {
    expect(CustomerPortalSettingsSchema.safeParse({
      slug: null,
      portalEnabled: true,
      timezone: 'Europe/Paris',
      portalContactPhone: '+33123456789',
      portalContactEmail: null,
      portalOtpEmailTemplate: null,
      portalConfirmationEmailTemplate: null,
    }).success).toBe(false)
    expect(CustomerPortalSettingsSchema.safeParse({
      slug: 'atelier-dupont',
      portalEnabled: true,
      timezone: 'Not/A-Timezone',
      portalContactPhone: '+33123456789',
      portalContactEmail: null,
      portalOtpEmailTemplate: null,
      portalConfirmationEmailTemplate: null,
    }).success).toBe(false)
    expect(CustomerPortalSettingsSchema.safeParse({
      slug: 'atelier-dupont',
      portalEnabled: true,
      timezone: 'Europe/Paris',
      portalContactPhone: null,
      portalContactEmail: null,
      portalOtpEmailTemplate: null,
      portalConfirmationEmailTemplate: null,
    }).success).toBe(true)
    const validSettings = CustomerPortalSettingsSchema.safeParse({
      slug: 'atelier-dupont',
      portalEnabled: true,
      timezone: 'Europe/Paris',
      portalContactPhone: null,
      portalContactEmail: ' Contact@Example.com ',
      portalOtpEmailTemplate: null,
      portalConfirmationEmailTemplate: null,
    })
    expect(validSettings.success).toBe(true)
    if (validSettings.success) {
      expect(validSettings.data.portalContactEmail).toBe('contact@example.com')
    }
  })

  it('validates supported and required variables in custom email templates', () => {
    expect(CustomerPortalSettingsSchema.safeParse({
      slug: 'atelier-dupont',
      portalEnabled: false,
      timezone: 'Europe/Paris',
      portalContactPhone: null,
      portalContactEmail: null,
      portalOtpEmailTemplate: 'Votre code : {{code}}',
      portalConfirmationEmailTemplate: 'Rendez-vous {{serviceName}} le {{date}} à {{startTime}}-{{endTime}}',
    }).success).toBe(true)
    expect(CustomerPortalSettingsSchema.safeParse({
      slug: 'atelier-dupont',
      portalEnabled: false,
      timezone: 'Europe/Paris',
      portalContactPhone: null,
      portalContactEmail: null,
      portalOtpEmailTemplate: 'Votre code : {{unknown}}',
      portalConfirmationEmailTemplate: null,
    }).success).toBe(false)
  })

  it('rejects organization identifiers in OTP requests', () => {
    expect(CustomerPortalOtpRequestSchema.safeParse({
      organizationSlug: 'atelier-dupont',
      email: 'client@example.com',
      organizationId: 'internal-id',
    }).success).toBe(false)
  })

  it('accepts only a numeric six-digit OTP and rejects extra identity fields', () => {
    expect(CustomerPortalOtpVerificationSchema.safeParse({
      organizationSlug: 'atelier-dupont',
      email: 'client@example.com',
      code: '012345',
    }).success).toBe(true)
    expect(CustomerPortalOtpVerificationSchema.safeParse({
      organizationSlug: 'atelier-dupont',
      email: 'client@example.com',
      code: '12345a',
      customerId: 'customer-id',
    }).success).toBe(false)
  })

  it('does not accept client-supplied duration, price, or organization for booking', () => {
    expect(CustomerPortalBookingSchema.safeParse({
      customerId: 'customer-id',
      serviceId: 'service-id',
      staffId: 'staff-id',
      start: '2026-10-01T08:00:00.000Z',
      duration: 60,
    }).success).toBe(false)
  })

  it('accepts only a real local calendar date', () => {
    expect(CustomerPortalDateSchema.safeParse('2026-10-01').success).toBe(true)
    expect(CustomerPortalDateSchema.safeParse('2026-02-30').success).toBe(false)
  })
})

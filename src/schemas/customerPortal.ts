import { z } from 'zod'

export const CustomerPortalSlugSchema = z.string()
  .min(3)
  .max(63)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)

const timezoneSchema = z.string().min(1).max(100).refine((timezone) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone })
    return true
  } catch {
    return false
  }
}, 'Fuseau horaire IANA invalide')

export const CustomerPortalSettingsSchema = z.object({
  slug: CustomerPortalSlugSchema.nullable(),
  portalEnabled: z.boolean(),
  timezone: timezoneSchema,
}).strict().refine((settings) => !settings.portalEnabled || settings.slug !== null, {
  message: 'Un slug est requis pour activer le portail',
  path: ['slug'],
})

export const CustomerPortalOtpRequestSchema = z.object({
  organizationSlug: CustomerPortalSlugSchema,
  email: z.string().trim().email().transform((email) => email.toLowerCase()),
}).strict()

export const CustomerPortalOtpVerificationSchema = CustomerPortalOtpRequestSchema.extend({
  code: z.string().regex(/^\d{6}$/),
}).strict()

export const CustomerPortalDateSchema = z.string().refine((date) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) return false
  const candidate = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  return candidate.toISOString().slice(0, 10) === date
}, 'Date locale invalide')

export const CustomerPortalBookingSchema = z.object({
  customerId: z.string().min(1),
  serviceId: z.string().min(1),
  staffId: z.string().min(1).optional(),
  start: z.string().datetime({ offset: true }),
}).strict()

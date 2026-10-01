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

export const CustomerPortalChangeRequestSchema = z.object({
  requestedStart: z.string().datetime({ offset: true }),
  reason: z.string().trim().max(500).optional(),
}).strict()

export const AppointmentChangeRequestIdSchema = z.string().min(1).max(128)

export const CustomerPortalChangeRequestResultSchema = z.object({
  id: z.string().min(1),
  status: z.literal('PENDING'),
}).strict()

export const CustomerPortalAvailableSlotsSchema = z.object({
  timezone: timezoneSchema,
  slots: z.array(z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }).strict()),
}).strict()

export const AppointmentChangeRequestSummarySchema = z.object({
  id: z.string().min(1),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
  reviewReason: z.string().nullable(),
}).strict()

export const CustomerPortalAppointmentIdSchema = z.string().min(1).max(128)

export const CustomerPortalAppointmentSummarySchema = z.object({
  id: z.string().min(1),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  status: z.string().min(1),
  serviceId: z.string().min(1),
  staffId: z.string().min(1).nullable(),
  customer: z.object({
    firstName: z.string(),
    lastName: z.string(),
  }).strict(),
  service: z.object({ name: z.string() }).strict(),
  staff: z.object({
    firstName: z.string(),
    lastName: z.string(),
  }).strict().nullable(),
  canCancel: z.boolean(),
  changeRequest: AppointmentChangeRequestSummarySchema.nullable(),
}).strict()

export const CustomerPortalAppointmentsSchema = z.object({
  timezone: timezoneSchema,
  appointments: z.array(CustomerPortalAppointmentSummarySchema),
}).strict()

export const StaffAppointmentChangeRequestSchema = z.object({
  id: z.string().min(1),
  requestedStart: z.string().datetime(),
  requestedEnd: z.string().datetime(),
  reason: z.string().nullable(),
  createdAt: z.string().datetime(),
  appointment: z.object({
    id: z.string().min(1),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    customer: z.object({ firstName: z.string(), lastName: z.string() }).strict(),
    service: z.object({ name: z.string() }).strict(),
    staff: z.object({ firstName: z.string(), lastName: z.string() }).strict().nullable(),
  }).strict(),
}).strict()

export const StaffAppointmentChangeRequestsSchema = z.object({
  timezone: timezoneSchema,
  requests: z.array(StaffAppointmentChangeRequestSchema),
}).strict()

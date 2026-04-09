import { z } from 'zod'

export const CreateAppointmentSchema = z.object({
  start: z.string().refine((v) => !Number.isNaN(Date.parse(v)), { message: 'start must be a valid ISO date string' }),
  end: z.string().refine((v) => !Number.isNaN(Date.parse(v)), { message: 'end must be a valid ISO date string' }),
  duration: z.number().int().positive(),
  serviceId: z.string().min(1),
  customerId: z.string().min(1),
  staffId: z.string().min(1).optional(),
  note: z.string().optional(),
  force: z.boolean().optional(),
  customerPackageId: z.string().nullable().optional()
})

export const UpdateAppointmentSchema = z.object({
  id: z.string().min(1),
  start: z.string().refine((v) => !Number.isNaN(Date.parse(v))),
  end: z.string().refine((v) => !Number.isNaN(Date.parse(v))),
  duration: z.number().int().positive(),
  serviceId: z.string().min(1),
  customerId: z.string().min(1),
  staffId: z.string().min(1).optional(),
  note: z.string().optional(),
  force: z.boolean().optional(),
  customerPackageId: z.string().nullable().optional()
})

export type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>
export type UpdateAppointmentInput = z.infer<typeof UpdateAppointmentSchema>


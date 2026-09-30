import { z } from 'zod'

export const StaffCreateSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
}).strict()

export const StaffUpdateSchema = StaffCreateSchema.extend({
  active: z.boolean().optional(),
}).strict()

export const StaffIdSchema = z.string().trim().min(1).max(128)
export const StaffAppointmentCountSchema = z.string()
  .regex(/^(0|[1-9]\d*)$/)
  .transform(Number)
  .refine(Number.isSafeInteger)
  .optional()
export const StaffSchema = z.object({
  id: z.string().min(1),
  firstName: z.string(),
  lastName: z.string(),
  active: z.boolean(),
}).strict()
export const StaffListSchema = z.array(StaffSchema.extend({ title: z.string() }))

export type StaffCreateInput = z.infer<typeof StaffCreateSchema>
export type StaffUpdateInput = z.infer<typeof StaffUpdateSchema>

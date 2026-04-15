import { z } from 'zod'

export const CustomerCreateSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  // phone is optional for quick-creation flows (inline picker). Store as nullable in DB.
  phone: z.string().min(1).optional().nullable(),
  notes: z.string().optional().nullable()
})

export const CustomerUpdateSchema = z.object({
  id: z.string().min(1),
  notes: z.string().optional().nullable()
})

export type CustomerCreateInput = z.infer<typeof CustomerCreateSchema>
export type CustomerUpdateInput = z.infer<typeof CustomerUpdateSchema>


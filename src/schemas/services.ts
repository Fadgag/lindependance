import { z } from 'zod'

export const ServiceCreateSchema = z.object({
  name: z.string().min(1),
  durationMinutes: z.number().int().positive(),
  price: z.number().optional(),
  color: z.string().optional()
})

export const ServiceUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  durationMinutes: z.number().int().positive().optional(),
  price: z.number().optional(),
  color: z.string().optional()
})

export type ServiceCreateInput = z.infer<typeof ServiceCreateSchema>
export type ServiceUpdateInput = z.infer<typeof ServiceUpdateSchema>


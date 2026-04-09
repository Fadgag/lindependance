import { z } from 'zod'

export const CreatePackageSchema = z.object({
  name: z.string().min(1),
  price: z.number().nonnegative().optional(),
  description: z.string().optional(),
})

export type CreatePackageInput = z.infer<typeof CreatePackageSchema>


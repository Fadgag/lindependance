import { z } from 'zod'

const VALID_ICONS = ['Package', 'Droplet', 'Sparkles', 'Scissors', 'FlaskConical', 'Wind', 'Heart', 'Star'] as const
export type ProductIconName = typeof VALID_ICONS[number]

export const ProductCreateSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  priceTTC: z.number().min(0, 'Le prix doit être positif'),
  taxRate: z.number().refine((v) => [0, 5.5, 10, 20].includes(v), {
    message: 'Taux de TVA invalide (0, 5.5, 10 ou 20%)',
  }),
  stock: z.number().int().min(0).default(0),
  iconName: z.enum(VALID_ICONS).default('Package'),
})

export const ProductUpdateSchema = ProductCreateSchema.partial()

export type ProductCreateInput = z.infer<typeof ProductCreateSchema>
export type ProductUpdateInput = z.infer<typeof ProductUpdateSchema>




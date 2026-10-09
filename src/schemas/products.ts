import { z } from 'zod'
import { MAX_STOCK_QUANTITY } from '@/domain/stock/policies'

const VALID_ICONS = ['Package', 'Droplet', 'Sparkles', 'Scissors', 'FlaskConical', 'Wind', 'Heart', 'Star'] as const
export type ProductIconName = typeof VALID_ICONS[number]

export const ProductCreateSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  priceTTC: z.number().min(0, 'Le prix doit être positif'),
  taxRate: z.number().refine((v) => [0, 5.5, 10, 20].includes(v), {
    message: 'Taux de TVA invalide (0, 5.5, 10 ou 20%)',
  }),
  stock: z.number().int().min(0).max(MAX_STOCK_QUANTITY).default(0),
  stockMinimum: z.number().int().min(0).max(MAX_STOCK_QUANTITY).default(0),
  iconName: z.enum(VALID_ICONS).default('Package'),
})

export const ProductUpdateSchema = ProductCreateSchema.omit({ stock: true }).partial().strict()

const StockMovementNoteSchema = z.string().trim().max(250).optional()
const StockMovementQuantitySchema = z.number().int().safe().min(-MAX_STOCK_QUANTITY).max(MAX_STOCK_QUANTITY)
const STOCK_MOVEMENT_TYPES = ['INITIAL', 'RECEIPT', 'ADJUSTMENT', 'SALE'] as const

export const ProductStockMovementSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('RECEIPT'),
    quantityDelta: StockMovementQuantitySchema.positive(),
    note: StockMovementNoteSchema,
  }).strict(),
  z.object({
    type: z.literal('ADJUSTMENT'),
    quantityDelta: StockMovementQuantitySchema.refine((quantity) => quantity !== 0),
    note: StockMovementNoteSchema,
  }).strict(),
])

export const ProductStockMovementParamsSchema = z.object({
  id: z.string().min(1),
})

export const ProductStockMovementListSchema = z.array(z.object({
  id: z.string(),
  productId: z.string().nullable(),
  productName: z.string(),
  type: z.enum(STOCK_MOVEMENT_TYPES),
  quantityDelta: z.number().int(),
  stockBefore: z.number().int(),
  stockAfter: z.number().int(),
  note: z.string().nullable(),
  appointmentId: z.string().nullable(),
  createdAt: z.string().datetime(),
}))

export type ProductCreateInput = z.infer<typeof ProductCreateSchema>
export type ProductUpdateInput = z.infer<typeof ProductUpdateSchema>
export type ProductStockMovementInput = z.infer<typeof ProductStockMovementSchema>

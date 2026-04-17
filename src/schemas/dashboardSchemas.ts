
import { z } from 'zod'

export const SoldProductSchema = z.object({
  productId: z.string().optional(),
  name: z.string().optional(),
  priceTTC: z.number().optional(),
  quantity: z.number().optional(),
  totalTTC: z.number().optional(),
  taxRate: z.number().optional()
})

export const DashboardSummarySchema = z.object({
  servicesTotal: z.number(),
  productsTotal: z.number(),
  totalCA: z.number()
})

export const DashboardDetailItemSchema = z.object({
  appointmentId: z.string(),
  date: z.string(),
  clientName: z.string(),
  serviceName: z.string(),
  productsSum: z.number(),
  totalTTC: z.number(),
  products: z.array(SoldProductSchema)
})

export type SoldProduct = z.infer<typeof SoldProductSchema>
export type DashboardDetailItem = z.infer<typeof DashboardDetailItemSchema>


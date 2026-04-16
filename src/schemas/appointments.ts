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
  // optional: drag-and-drop updates only send timing data
  serviceId: z.string().min(1).optional(),
  customerId: z.string().min(1).optional(),
  staffId: z.string().min(1).optional(),
  note: z.string().optional(),
  force: z.boolean().optional(),
  customerPackageId: z.string().nullable().optional()
})

export const UpdatePaymentDetailsSchema = z.object({
  paymentMethod: z.enum(['CB', 'CASH', 'CHECK'], { required_error: 'Mode de paiement requis' }),
  note: z.string().max(1000).optional().nullable(),
})

export type UpdatePaymentDetailsInput = z.infer<typeof UpdatePaymentDetailsSchema>

export const CheckoutInputSchema = z.object({
  totalPrice: z.number().min(0),
  paymentMethod: z.enum(['CB', 'CASH', 'CHECK']),
  note: z.string().max(2000).optional().nullable(),
  extras: z.array(z.object({
    label: z.string().max(200),
    price: z.number(),
  })).optional(),
  soldProducts: z.array(z.object({
    productId: z.string().cuid(),
    name: z.string().max(500),
    iconName: z.string().max(100),
    quantity: z.number().int().positive().max(999),
    priceTTC: z.number().min(0),
    taxRate: z.number().min(0),
    totalTTC: z.number().min(0),
    totalTax: z.number().min(0),
  })).optional(),
})

export type CheckoutInput = z.infer<typeof CheckoutInputSchema>

export type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>
export type UpdateAppointmentInput = z.infer<typeof UpdateAppointmentSchema>


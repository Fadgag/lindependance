import type { Prisma } from '@prisma/client'

export type AppointmentDetailRow = {
  id: string
  startTime: Date
  status: string
  finalPrice: number | null
  price: Prisma.Decimal | number
  soldProducts: unknown
  soldProductsJson?: unknown
  productsTotal?: number | null
  customer: { firstName: string; lastName: string } | null
  service: { name?: string; price?: Prisma.Decimal | number } | null
}

export type DashboardTotals = {
  totalAmount: number
  totalServicesSum: number
  totalProductsSum: number
}


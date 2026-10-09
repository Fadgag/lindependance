import { describe, expect, it } from 'vitest'
import { ProductCreateSchema, ProductStockMovementSchema, ProductUpdateSchema } from '@/schemas/products'
import { MAX_STOCK_QUANTITY } from '@/domain/stock/policies'

describe('product stock schemas', () => {
  it('defaults the minimum stock to zero', () => {
    const product = ProductCreateSchema.parse({
      name: 'Huile capillaire',
      priceTTC: 12,
      taxRate: 20,
    })

    expect(product.stockMinimum).toBe(0)
  })

  it('does not allow a product update to bypass stock movement history', () => {
    expect(ProductUpdateSchema.safeParse({ stock: 12 }).success).toBe(false)
  })

  it('rejects stock quantities that cannot fit in the database integer columns', () => {
    expect(ProductCreateSchema.safeParse({
      name: 'Huile capillaire',
      priceTTC: 12,
      taxRate: 20,
      stock: MAX_STOCK_QUANTITY + 1,
    }).success).toBe(false)
    expect(ProductStockMovementSchema.safeParse({
      type: 'RECEIPT',
      quantityDelta: MAX_STOCK_QUANTITY + 1,
    }).success).toBe(false)
  })

  it('accepts signed adjustments but only positive receipts', () => {
    expect(ProductStockMovementSchema.safeParse({
      type: 'ADJUSTMENT',
      quantityDelta: -2,
    }).success).toBe(true)
    expect(ProductStockMovementSchema.safeParse({
      type: 'RECEIPT',
      quantityDelta: -2,
    }).success).toBe(false)
    expect(ProductStockMovementSchema.safeParse({
      type: 'ADJUSTMENT',
      quantityDelta: 0,
    }).success).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'
import { calculateStockMovement, isAtOrBelowStockMinimum, MAX_STOCK_QUANTITY } from '@/domain/stock/policies'

describe('stock policies', () => {
  it('calculates a positive or negative movement with before and after quantities', () => {
    expect(calculateStockMovement(8, 3)).toEqual({
      stockBefore: 8,
      quantityDelta: 3,
      stockAfter: 11,
    })
    expect(calculateStockMovement(8, -3)).toEqual({
      stockBefore: 8,
      quantityDelta: -3,
      stockAfter: 5,
    })
  })

  it('rejects zero, fractional, and below-zero movements', () => {
    expect(calculateStockMovement(8, 0)).toBeNull()
    expect(calculateStockMovement(8, 1.5)).toBeNull()
    expect(calculateStockMovement(2, -3)).toBeNull()
  })

  it('rejects stock quantities above the database integer limit', () => {
    expect(calculateStockMovement(MAX_STOCK_QUANTITY, 1)).toBeNull()
    expect(calculateStockMovement(MAX_STOCK_QUANTITY + 1, -1)).toBeNull()
  })

  it('flags stock at or below the configured minimum', () => {
    expect(isAtOrBelowStockMinimum(2, 2)).toBe(true)
    expect(isAtOrBelowStockMinimum(1, 2)).toBe(true)
    expect(isAtOrBelowStockMinimum(3, 2)).toBe(false)
  })
})

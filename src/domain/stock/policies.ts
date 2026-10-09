export interface StockMovementQuantities {
  stockBefore: number
  quantityDelta: number
  stockAfter: number
}

export const MAX_STOCK_QUANTITY = 2_147_483_647

export function calculateStockMovement(
  stockBefore: number,
  quantityDelta: number,
): StockMovementQuantities | null {
  const stockAfter = stockBefore + quantityDelta
  if (
    !Number.isSafeInteger(stockBefore)
    || stockBefore < 0
    || stockBefore > MAX_STOCK_QUANTITY
    || !Number.isSafeInteger(quantityDelta)
    || Math.abs(quantityDelta) > MAX_STOCK_QUANTITY
    || quantityDelta === 0
    || !Number.isSafeInteger(stockAfter)
    || stockAfter < 0
    || stockAfter > MAX_STOCK_QUANTITY
  ) {
    return null
  }

  return { stockBefore, quantityDelta, stockAfter }
}

export function isAtOrBelowStockMinimum(stock: number, stockMinimum: number): boolean {
  return stock <= stockMinimum
}

export type ParsedSoldProducts = {
  sum: number
  products: Array<{ productId?: string; name?: string; priceTTC?: number; quantity?: number }>
}

export default function parseSoldProducts(rawSold: unknown): ParsedSoldProducts {
  let productsSum = 0
  const products: ParsedSoldProducts['products'] = []
  if (!rawSold) return { sum: 0, products }
  try {
    const arr = typeof rawSold === 'string' ? JSON.parse(rawSold) : rawSold
    if (Array.isArray(arr)) {
      for (const it of arr) {
        const qty = typeof it.quantity === 'number' ? it.quantity : (it.quantity ? Number(it.quantity) : 1)
        const unit = typeof it.priceTTC === 'number' ? it.priceTTC : (it.priceTTC ? Number(it.priceTTC) : 0)
        const lineTotal = (typeof it.totalTTC === 'number' ? it.totalTTC : unit * (qty || 1))
        productsSum += Number(lineTotal)
        products.push({ productId: it.productId, name: it.name, priceTTC: unit, quantity: qty })
      }
    }
  } catch {
    // ignore parse errors for backward compatibility
  }
  return { sum: productsSum, products }
}


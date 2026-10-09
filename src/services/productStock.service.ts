import { ProductStockMovementType, type Prisma, type Product, type ProductStockMovement } from '@prisma/client'
import { calculateStockMovement } from '@/domain/stock/policies'

interface ApplyProductStockMovementInput {
  productId: string
  organizationId: string
  type: ProductStockMovementType
  quantityDelta: number
  note?: string
  appointmentId?: string
}

type ApplyProductStockMovementResult =
  | {
      status: 'created'
      movement: ProductStockMovement
      product: Pick<Product, 'id' | 'name' | 'stock' | 'stockMinimum'>
    }
  | { status: 'product-not-found' | 'insufficient-stock' | 'stock-capacity-exceeded' }

export async function applyProductStockMovement(
  transaction: Prisma.TransactionClient,
  input: ApplyProductStockMovementInput,
): Promise<ApplyProductStockMovementResult> {
  const productWhere = { id: input.productId, organizationId: input.organizationId }
  const products = await transaction.$queryRaw<Array<Pick<Product, 'id' | 'name' | 'stock' | 'stockMinimum'>>>`
    SELECT "id", "name", "stock", "stockMinimum"
    FROM "Product"
    WHERE "id" = ${input.productId} AND "organizationId" = ${input.organizationId}
    FOR UPDATE
  `
  const product = products[0]
  if (!product) return { status: 'product-not-found' }

  const quantities = calculateStockMovement(product.stock, input.quantityDelta)
  if (!quantities && input.quantityDelta > 0) return { status: 'stock-capacity-exceeded' }

  const updateResult = await transaction.product.updateMany({
    where: {
      ...productWhere,
      ...(input.quantityDelta < 0 ? { stock: { gte: -input.quantityDelta } } : {}),
    },
    data: { stock: { increment: input.quantityDelta } },
  })
  if (updateResult.count === 0) {
    return input.quantityDelta < 0
      ? { status: 'insufficient-stock' }
      : { status: 'product-not-found' }
  }
  if (!quantities) throw new Error('INVALID_STOCK_MOVEMENT_STATE')

  const updatedProduct = { ...product, stock: quantities.stockAfter }

  const movement = await transaction.productStockMovement.create({
    data: {
      productId: input.productId,
      productName: product.name,
      organizationId: input.organizationId,
      type: input.type,
      quantityDelta: quantities.quantityDelta,
      stockBefore: quantities.stockBefore,
      stockAfter: quantities.stockAfter,
      note: input.note,
      appointmentId: input.appointmentId,
    },
  })

  return { status: 'created', movement, product: updatedProduct }
}

export async function recordInitialProductStock(
  transaction: Prisma.TransactionClient,
  product: Pick<Product, 'id' | 'name' | 'organizationId' | 'stock'>,
): Promise<ProductStockMovement | null> {
  if (product.stock === 0) return null

  return transaction.productStockMovement.create({
    data: {
      productId: product.id,
      productName: product.name,
      organizationId: product.organizationId,
      type: ProductStockMovementType.INITIAL,
      quantityDelta: product.stock,
      stockBefore: 0,
      stockAfter: product.stock,
    },
  })
}

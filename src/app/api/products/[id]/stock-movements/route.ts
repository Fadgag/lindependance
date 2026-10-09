import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { ProductStockMovementParamsSchema, ProductStockMovementSchema } from '@/schemas/products'
import { applyProductStockMovement } from '@/services/productStock.service'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const session = await auth()
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const organizationId = session.user.organizationId

    const parsedParams = ProductStockMovementParamsSchema.safeParse(await params)
    if (!parsedParams.success) return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 })
    const { id } = parsedParams.data
    const product = await prisma.product.findFirst({
      where: { id, organizationId },
      select: { id: true },
    })
    if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const movements = await prisma.productStockMovement.findMany({
      where: { productId: id, organizationId },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(movements)
  } catch (error) {
    logger.error('Product stock history failed', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const session = await auth()
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const organizationId = session.user.organizationId

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = ProductStockMovementSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 })
  }

  const parsedParams = ProductStockMovementParamsSchema.safeParse(await params)
  if (!parsedParams.success) return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 })
  const { id } = parsedParams.data
  try {
    const result = await prisma.$transaction((transaction) =>
      applyProductStockMovement(transaction, {
        ...parsed.data,
        productId: id,
        organizationId,
      }),
    )
    if (result.status === 'product-not-found') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (result.status === 'insufficient-stock') {
      return NextResponse.json({ error: 'Stock insuffisant' }, { status: 409 })
    }
    if (result.status === 'stock-capacity-exceeded') {
      return NextResponse.json({ error: 'Limite de stock atteinte' }, { status: 409 })
    }
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    logger.error('Product stock movement failed', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

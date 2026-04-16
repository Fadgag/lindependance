import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { logger } from '@/lib/logger'
import { ProductCreateSchema, ProductUpdateSchema } from '@/schemas/products'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!session.user?.organizationId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const products = await prisma.product.findMany({
    where: { organizationId: session.user.organizationId },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(products)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!session.user?.organizationId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = ProductCreateSchema.safeParse(await request.json())
  if (!parsed.success) {
    logger.warn('products.POST validation failed', parsed.error.format())
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 })
  }

  const product = await prisma.product.create({
    data: { ...parsed.data, organizationId: session.user.organizationId },
  })
  return NextResponse.json(product, { status: 201 })
}

export async function PUT(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!session.user?.organizationId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID manquant' }, { status: 400 })

  // Anti-IDOR: vérifier que le produit appartient à l'organisation
  const existing = await prisma.product.findFirst({
    where: { id, organizationId: session.user.organizationId },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const parsed = ProductUpdateSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 })
  }

  const product = await prisma.product.update({ where: { id }, data: parsed.data })
  return NextResponse.json(product)
}

export async function DELETE(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!session.user?.organizationId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID manquant' }, { status: 400 })

  // Anti-IDOR
  const existing = await prisma.product.findFirst({
    where: { id, organizationId: session.user.organizationId },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.product.delete({ where: { id } })
  return NextResponse.json({ success: true })
}


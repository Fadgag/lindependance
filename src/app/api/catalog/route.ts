import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import apiErrorResponse from '@/lib/api'

type CatalogItem = {
  id: string
  type: 'SERVICE' | 'PRODUCT'
  name: string
  priceTTC?: number
  price?: number
  durationMinutes?: number
  stock?: number
  iconName?: string
  color?: string | null
}

export async function GET() {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!session.user?.organizationId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const orgId = session.user.organizationId

    const [services, products] = await Promise.all([
      prisma.service.findMany({ where: { organizationId: orgId } }),
      prisma.product.findMany({ where: { organizationId: orgId } }),
    ])

    const mappedServices: CatalogItem[] = services.map((s) => ({
      id: s.id,
      type: 'SERVICE' as const,
      name: s.name,
      price: Number(s.price ?? 0),
      durationMinutes: s.durationMinutes,
      color: s.color ?? null,
    }))

    const mappedProducts: CatalogItem[] = products.map((p) => ({
      id: p.id,
      type: 'PRODUCT' as const,
      name: p.name,
      priceTTC: p.priceTTC,
      stock: p.stock,
      iconName: p.iconName,
    }))

    const catalog = [...mappedServices, ...mappedProducts].sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json(catalog)
  } catch (err) {
    return apiErrorResponse(err)
  }
}



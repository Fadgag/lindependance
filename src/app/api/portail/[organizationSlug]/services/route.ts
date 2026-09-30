import { NextResponse } from 'next/server'
import apiErrorResponse from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { findEnabledPortalOrganization } from '@/services/customerPortal.service'

interface RouteContext {
  params: Promise<{ organizationSlug: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { organizationSlug } = await context.params
    const organization = await findEnabledPortalOrganization(organizationSlug)
    if (!organization) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const services = await prisma.service.findMany({
      where: { organizationId: organization.id },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        durationMinutes: true,
        price: true,
        color: true,
      },
    })

    return NextResponse.json(services.map((service) => ({
      id: service.id,
      name: service.name,
      durationMinutes: service.durationMinutes,
      price: Number(service.price),
      color: service.color,
    })))
  } catch (error: unknown) {
    return apiErrorResponse(error)
  }
}

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

    const staff = await prisma.staff.findMany({
      where: { organizationId: organization.id, active: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: { id: true, firstName: true, lastName: true },
    })
    return NextResponse.json(staff.map(({ id, firstName, lastName }) => ({ id, firstName, lastName })))
  } catch (error: unknown) {
    return apiErrorResponse(error)
  }
}

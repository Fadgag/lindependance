import { NextResponse } from 'next/server'
import apiErrorResponse from '@/lib/api'
import { prisma } from '@/lib/prisma'
import {
  findEnabledPortalOrganization,
  getCustomerPortalSession,
} from '@/services/customerPortal.service'

interface RouteContext {
  params: Promise<{ organizationSlug: string }>
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { organizationSlug } = await context.params
    const organization = await findEnabledPortalOrganization(organizationSlug)
    if (!organization) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const session = getCustomerPortalSession(request)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.accountType !== 'CUSTOMER' || session.organizationId !== organization.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const customers = await prisma.customer.findMany({
      where: {
        organizationId: session.organizationId,
        email: session.verifiedEmail,
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: { id: true, firstName: true, lastName: true },
    })
    return NextResponse.json(customers.map(({ id, firstName, lastName }) => ({ id, firstName, lastName })))
  } catch (error: unknown) {
    return apiErrorResponse(error)
  }
}

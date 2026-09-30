import { NextResponse } from 'next/server'
import apiErrorResponse from '@/lib/api'
import { CustomerPortalDateSchema } from '@/schemas/customerPortal'
import { prisma } from '@/lib/prisma'
import { getUtcRangeForLocalDay } from '@/domain/customer-portal/scheduling'
import { findEnabledPortalOrganization } from '@/services/customerPortal.service'

interface RouteContext {
  params: Promise<{ organizationSlug: string }>
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { organizationSlug } = await context.params
    const organization = await findEnabledPortalOrganization(organizationSlug)
    if (!organization) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const dateParsed = CustomerPortalDateSchema.safeParse(new URL(request.url).searchParams.get('date'))
    if (!dateParsed.success) return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
    const range = getUtcRangeForLocalDay(dateParsed.data, organization.timezone)
    if (!range) return NextResponse.json({ error: 'Invalid date or timezone' }, { status: 400 })

    const [appointments, unavailabilities] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          organizationId: organization.id,
          status: { not: 'CANCELLED' },
          startTime: { lt: range.end },
          endTime: { gt: range.start },
        },
        select: { startTime: true, endTime: true },
      }),
      prisma.unavailability.findMany({
        where: {
          organizationId: organization.id,
          start: { lt: range.end },
          end: { gt: range.start },
        },
        select: { start: true, end: true },
      }),
    ])

    const events = [
      ...appointments.map((appointment) => ({
        start: appointment.startTime.toISOString(),
        end: appointment.endTime.toISOString(),
        status: 'RESERVED' as const,
      })),
      ...unavailabilities.map((unavailability) => ({
        start: unavailability.start.toISOString(),
        end: unavailability.end.toISOString(),
        status: 'UNAVAILABLE' as const,
      })),
    ].sort((left, right) => left.start.localeCompare(right.start))

    const response = NextResponse.json(events)
    response.headers.set('X-Portal-Timezone', organization.timezone)
    return response
  } catch (error: unknown) {
    return apiErrorResponse(error)
  }
}

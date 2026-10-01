import { NextResponse } from 'next/server'
import { z } from 'zod'
import { buildAvailableSlots, getUtcRangeForLocalDay, resolvePortalStaffSelection } from '@/domain/customer-portal/scheduling'
import apiErrorResponse from '@/lib/api'
import { CustomerPortalDateSchema } from '@/schemas/customerPortal'
import { prisma } from '@/lib/prisma'
import { findEnabledPortalOrganization } from '@/services/customerPortal.service'

interface RouteContext {
  params: Promise<{ organizationSlug: string }>
}

const QuerySchema = z.object({
  serviceId: z.string().min(1),
  staffId: z.string().min(1).optional(),
  date: CustomerPortalDateSchema,
}).strict()

export async function GET(request: Request, context: RouteContext) {
  try {
    const { organizationSlug } = await context.params
    const organization = await findEnabledPortalOrganization(organizationSlug)
    if (!organization) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const url = new URL(request.url)
    const query = QuerySchema.safeParse({
      serviceId: url.searchParams.get('serviceId') ?? undefined,
      staffId: url.searchParams.get('staffId') ?? undefined,
      date: url.searchParams.get('date') ?? undefined,
    })
    if (!query.success) return NextResponse.json({ error: 'Invalid query' }, { status: 400 })

    const service = await prisma.service.findFirst({
      where: { id: query.data.serviceId, organizationId: organization.id },
      select: { durationMinutes: true },
    })
    if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 })

    const staff = await prisma.staff.findMany({
      where: { organizationId: organization.id, active: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: { id: true },
    })
    const selection = resolvePortalStaffSelection(
      staff.map((member) => member.id),
      query.data.staffId,
    )
    if (selection.status === 'unavailable') {
      return NextResponse.json({ error: 'No practitioners are available' }, { status: 409 })
    }
    if (selection.status === 'required') {
      return NextResponse.json({ error: 'Select a practitioner' }, { status: 400 })
    }
    if (selection.status === 'invalid') {
      return NextResponse.json({ error: 'Invalid practitioner' }, { status: 400 })
    }

    const range = getUtcRangeForLocalDay(query.data.date, organization.timezone)
    if (!range) return NextResponse.json({ error: 'Invalid date or timezone' }, { status: 400 })

    const [appointments, unavailabilities] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          organizationId: organization.id,
          status: { not: 'CANCELLED' },
          startTime: { lt: range.end },
          endTime: { gt: range.start },
        },
        select: { startTime: true, endTime: true, staffId: true, status: true },
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

    const slots = buildAvailableSlots({
      date: query.data.date,
      timezone: organization.timezone,
      openingTime: organization.openingTime,
      closingTime: organization.closingTime,
      durationMinutes: service.durationMinutes,
      slotIntervalMinutes: 30,
      staffId: selection.staffId,
      staffIds: staff.map((member) => member.id),
      appointments,
      unavailabilities: unavailabilities.map((unavailability) => ({
        startTime: unavailability.start,
        endTime: unavailability.end,
      })),
      now: new Date(),
    })

    return NextResponse.json({ timezone: organization.timezone, slots })
  } catch (error: unknown) {
    return apiErrorResponse(error)
  }
}

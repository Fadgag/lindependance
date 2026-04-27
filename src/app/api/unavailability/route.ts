import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { z } from 'zod'
import apiErrorResponse from '@/lib/api'
import { RECURRENCE_OPTIONS } from '@/types/models'
import type { Recurrence } from '@/types/models'
import { buildOccurrences } from '@/services/unavailability.service'
import type { UnavailabilityWhereClause } from '@/services/unavailability.service'

const CreateSchema = z.object({
  title: z.string().min(1).max(200),
  start: z.string().datetime(),
  end: z.string().datetime(),
  allDay: z.boolean().optional().default(false),
  recurrence: z.enum(RECURRENCE_OPTIONS).optional().default('NONE'),
})

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const organizationId = session.user.organizationId!

    const url = new URL(request.url)
    const QuerySchema = z.object({
      start: z.string().datetime().optional(),
      end: z.string().datetime().optional(),
    })
    const queryParsed = QuerySchema.safeParse({
      start: url.searchParams.get('start') ?? undefined,
      end: url.searchParams.get('end') ?? undefined,
    })
    if (!queryParsed.success) return NextResponse.json({ error: 'Invalid params', details: queryParsed.error.format() }, { status: 400 })
    const { start: startParam, end: endParam } = queryParsed.data

    const where: UnavailabilityWhereClause = { organizationId }
    if (startParam && endParam) {
      // Overlap: event.start < range_end AND event.end > range_start
      where.AND = [{ start: { lt: new Date(endParam) } }, { end: { gt: new Date(startParam) } }]
    } else if (startParam) {
      where.AND = [{ end: { gt: new Date(startParam) } }]
    } else if (endParam) {
      where.AND = [{ start: { lt: new Date(endParam) } }]
    }

    const unavailabilities = await prisma.unavailability.findMany({
      where,
      orderBy: { start: 'asc' },
      select: { id: true, title: true, start: true, end: true, allDay: true, recurrence: true, recurrenceGroupId: true },
    })

    return NextResponse.json(
      unavailabilities.map((u) => ({
        id: u.id,
        title: u.title,
        start: u.start.toISOString(),
        end: u.end.toISOString(),
        allDay: u.allDay,
        recurrence: u.recurrence,
        recurrenceGroupId: u.recurrenceGroupId,
        type: 'unavailability',
        color: '#94a3b8',
        display: 'block',
        classNames: ['unavailability-block'],
        extendedProps: { type: 'unavailability', title: u.title, recurrence: u.recurrence, recurrenceGroupId: u.recurrenceGroupId },
      }))
    )
  } catch (err) {
    return apiErrorResponse(err)
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const organizationId = session.user.organizationId!

    const body = await request.json()
    const parsed = CreateSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 })

    const { title, start, end, allDay, recurrence } = parsed.data
    if (new Date(start) >= new Date(end)) {
      return NextResponse.json({ error: 'La date de fin doit être après la date de début' }, { status: 400 })
    }

    const startDate = new Date(start)
    const endDate = new Date(end)
    const rule = (recurrence ?? 'NONE') as Recurrence
    const occurrences = buildOccurrences(startDate, endDate, rule)

    // recurrenceGroupId shared by all instances in this series
    const recurrenceGroupId = rule !== 'NONE' ? crypto.randomUUID() : null

    await prisma.unavailability.createMany({
      data: occurrences.map((o) => ({
        title,
        start: o.start,
        end: o.end,
        allDay: allDay ?? false,
        recurrence: rule,
        recurrenceGroupId,
        organizationId,
      })),
    })

    return NextResponse.json({ count: occurrences.length, recurrence: rule }, { status: 201 })
  } catch (err) {
    return apiErrorResponse(err)
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const organizationId = session.user.organizationId!

    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    const deleteAll = url.searchParams.get('deleteAll') === '1'
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const existing = await prisma.unavailability.findFirst({ where: { id, organizationId }, select: { id: true, recurrenceGroupId: true } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (deleteAll && existing.recurrenceGroupId) {
      await prisma.unavailability.deleteMany({ where: { recurrenceGroupId: existing.recurrenceGroupId, organizationId } })
    } else {
      // RAISON: deleteMany avec organizationId garantit l'isolation même si findFirst était bypassé (Anti-IDOR)
      await prisma.unavailability.deleteMany({ where: { id, organizationId } })
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    return apiErrorResponse(err)
  }
}


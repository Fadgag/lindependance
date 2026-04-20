import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { z } from 'zod'
import apiErrorResponse from '@/lib/api'

const RECURRENCE_OPTIONS = ['NONE', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'] as const
type Recurrence = typeof RECURRENCE_OPTIONS[number]

const CreateSchema = z.object({
  title: z.string().min(1).max(200),
  start: z.string().datetime(),
  end: z.string().datetime(),
  allDay: z.boolean().optional().default(false),
  recurrence: z.enum(RECURRENCE_OPTIONS).optional().default('NONE'),
})

/** Generate series of (start, end) pairs based on recurrence rule */
function buildOccurrences(start: Date, end: Date, recurrence: Recurrence): Array<{ start: Date; end: Date }> {
  if (recurrence === 'NONE') return [{ start, end }]
  const durationMs = end.getTime() - start.getTime()
  const occurrences: Array<{ start: Date; end: Date }> = []
  const maxDate = new Date(start.getFullYear(), start.getMonth() + 6, start.getDate()) // 6 months ahead
  const stepDays = recurrence === 'WEEKLY' ? 7 : recurrence === 'BIWEEKLY' ? 14 : 0 // MONTHLY handled below
  let current = new Date(start)
  while (current <= maxDate) {
    occurrences.push({ start: new Date(current), end: new Date(current.getTime() + durationMs) })
    if (recurrence === 'MONTHLY') {
      current = new Date(current.getFullYear(), current.getMonth() + 1, current.getDate(), current.getHours(), current.getMinutes())
    } else {
      current = new Date(current.getTime() + stepDays * 24 * 60 * 60 * 1000)
    }
  }
  return occurrences
}


export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const organizationId = session.user.organizationId as string

    const url = new URL(request.url)
    const startParam = url.searchParams.get('start')
    const endParam = url.searchParams.get('end')

    type WhereClause = {
      organizationId: string
      AND?: Array<{ start?: { lt: Date }; end?: { gt: Date } }>
    }
    const where: WhereClause = { organizationId }
    if (startParam && endParam) {
      const rangeStart = new Date(startParam)
      const rangeEnd = new Date(endParam)
      if (!isNaN(rangeStart.getTime()) && !isNaN(rangeEnd.getTime())) {
        // Overlap: event.start < range_end AND event.end > range_start
        where.AND = [{ start: { lt: rangeEnd } }, { end: { gt: rangeStart } }]
      }
    } else if (startParam) {
      const d = new Date(startParam)
      if (!isNaN(d.getTime())) where.AND = [{ end: { gt: d } }]
    } else if (endParam) {
      const d = new Date(endParam)
      if (!isNaN(d.getTime())) where.AND = [{ start: { lt: d } }]
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
    const organizationId = session.user.organizationId as string

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
    const organizationId = session.user.organizationId as string

    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    const deleteAll = url.searchParams.get('deleteAll') === '1'
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const existing = await prisma.unavailability.findFirst({ where: { id, organizationId }, select: { id: true, recurrenceGroupId: true } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (deleteAll && existing.recurrenceGroupId) {
      await prisma.unavailability.deleteMany({ where: { recurrenceGroupId: existing.recurrenceGroupId, organizationId } })
    } else {
      await prisma.unavailability.delete({ where: { id } })
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    return apiErrorResponse(err)
  }
}


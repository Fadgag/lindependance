import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { z } from 'zod'
import apiErrorResponse from '@/lib/api'

const CreateSchema = z.object({
  title: z.string().min(1).max(200),
  start: z.string().datetime(),
  end: z.string().datetime(),
  allDay: z.boolean().optional().default(false),
})


export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const organizationId = session.user.organizationId as string

    const url = new URL(request.url)
    const startParam = url.searchParams.get('start')
    const endParam = url.searchParams.get('end')

    type WhereClause = { organizationId: string; start?: { gte?: Date }; end?: { lte?: Date } }
    const where: WhereClause = { organizationId }
    if (startParam) { const d = new Date(startParam); if (!isNaN(d.getTime())) where.start = { gte: d } }
    if (endParam)   { const d = new Date(endParam);   if (!isNaN(d.getTime())) where.end   = { lte: d } }

    const unavailabilities = await prisma.unavailability.findMany({
      where,
      orderBy: { start: 'asc' },
      select: { id: true, title: true, start: true, end: true, allDay: true },
    })

    return NextResponse.json(
      unavailabilities.map((u) => ({
        id: u.id,
        title: u.title,
        start: u.start.toISOString(),
        end: u.end.toISOString(),
        allDay: u.allDay,
        // Marqueur pour distinguer les indisponibilités des RDV dans le calendrier
        type: 'unavailability',
        color: '#94a3b8',
        display: 'block',
        classNames: ['unavailability-block'],
        extendedProps: { type: 'unavailability', title: u.title },
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

    const { title, start, end, allDay } = parsed.data
    if (new Date(start) >= new Date(end)) {
      return NextResponse.json({ error: 'La date de fin doit être après la date de début' }, { status: 400 })
    }

    const record = await prisma.unavailability.create({
      data: { title, start: new Date(start), end: new Date(end), allDay: allDay ?? false, organizationId },
      select: { id: true, title: true, start: true, end: true, allDay: true },
    })

    return NextResponse.json(record, { status: 201 })
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
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const existing = await prisma.unavailability.findFirst({ where: { id, organizationId }, select: { id: true } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.unavailability.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    return apiErrorResponse(err)
  }
}


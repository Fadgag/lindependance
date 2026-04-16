import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import apiErrorResponse from '@/lib/api'
import { CreateAppointmentSchema } from '@/schemas/appointments'
import { auth } from "@/auth"
import { parseJsonField } from '@/lib/parseAppointmentJson'
import type { Extra, SoldProduct } from '@/types/models'

export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const url = new URL(request.url)
        const startParam = url.searchParams.get('start')
        const endParam = url.searchParams.get('end')

        const where: { organizationId: string; startTime?: { gte?: Date; lte?: Date } } = {
            organizationId: session.user.organizationId
        }

        if (startParam) {
            const startDate = new Date(startParam)
            startDate.setHours(0, 0, 0, 0)
            where.startTime = { gte: startDate }
        }
        if (endParam) {
            const endDate = new Date(endParam)
            endDate.setHours(23, 59, 59, 999)
            where.startTime = { ...where.startTime, lte: endDate }
        }

        const appointments = await prisma.appointment.findMany({
            where,
            include: { service: true, customer: true },
        })

        return NextResponse.json(appointments
            .filter((a) => a.startTime)
            .map((a) => ({
                id: a.id,
                title: `${a.customer?.firstName || 'Client'} ${a.customer?.lastName || ''} — ${a.service?.name || 'Service'}`,
                start: a.startTime ? a.startTime.toISOString() : a.createdAt.toISOString(),
                end: a.endTime ? a.endTime.toISOString() : (a.startTime ? a.startTime.toISOString() : a.createdAt.toISOString()),
                status: a.status || "CONFIRMED",
                finalPrice: a.finalPrice ? Number(a.finalPrice) : 0,
                service: a.service ? {
                    id: a.service.id,
                    name: a.service.name,
                    price: a.service.price ? Number(a.service.price) : 0,
                    color: a.service.color
                } : null,
                customer: a.customer ? {
                    id: a.customer.id,
                    name: `${a.customer.firstName} ${a.customer.lastName}`.trim()
                } : null,
                resourceId: a.staffId,
                color: a.service?.color || "#3788d8",
                extras: parseJsonField<Extra>(a.extras),
                soldProducts: parseJsonField<SoldProduct>(a.soldProducts),
                extendedProps: {
                    serviceId: a.serviceId,
                    customerId: a.customerId,
                    note: a.note || null,
                    duration: a.duration,
                    status: a.status,
                    extras: parseJsonField<Extra>(a.extras),
                    soldProducts: parseJsonField<SoldProduct>(a.soldProducts),
                }
            })))
    } catch (err) {
        return apiErrorResponse(err)
    }
}

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await request.json()
        const parsed = CreateAppointmentSchema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 })
        }

        const { start, end, duration, serviceId, customerId, staffId, note } = parsed.data

        const svc = await prisma.service.findUnique({ where: { id: serviceId }, select: { price: true } })
        const servicePrice = svc?.price ?? 0

        const appointment = await prisma.appointment.create({
            data: {
                startTime: new Date(start),
                endTime: new Date(end),
                duration: Number(duration),
                note: note || null,
                serviceId,
                customerId,
                staffId,
                organizationId: session.user.organizationId,
                status: "CONFIRMED",
                price: servicePrice
            }
        })

        if (parsed.data.customerPackageId) {
          await prisma.customerPackage.updateMany({
            where: { id: parsed.data.customerPackageId, customer: { organizationId: session.user.organizationId }, sessionsRemaining: { gt: 0 } },
            data: { sessionsRemaining: { decrement: 1 } }
          })
        }
        return NextResponse.json(appointment)
    } catch (err) {
        return apiErrorResponse(err)
    }
}

export async function PUT(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await request.json()
        const { UpdateAppointmentSchema } = await import('@/schemas/appointments')
        const parsed = UpdateAppointmentSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 })
        }
        const { id, start, end, duration, serviceId, customerId, note, force } = parsed.data

        if (!id) return NextResponse.json({ error: 'Missing appointment id' }, { status: 400 })

        const existing = await prisma.appointment.findFirst({
            where: { id, organizationId: session.user.organizationId }
        })
        if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

        const newStart = new Date(start)
        const newEnd = new Date(end)

        if (!force) {
            const conflict = await prisma.appointment.findFirst({
                where: {
                    id: { not: id },
                    staffId: existing.staffId,
                    organizationId: session.user.organizationId,
                    AND: [
                        { startTime: { lt: newEnd } },
                        { endTime: { gt: newStart } },
                    ],
                }
            })
            if (conflict) return NextResponse.json({ error: 'Conflit horaire détecté' }, { status: 409 })
        }

        const updated = await prisma.appointment.update({
            where: { id },
            data: {
                startTime: newStart,
                endTime: newEnd,
                ...(duration !== undefined && { duration: Number(duration) }),
                ...(serviceId && { serviceId }),
                ...(customerId && { customerId }),
                ...(note !== undefined && { note: note || null }),
            }
        })

        return NextResponse.json(updated)
    } catch (err) {
        return apiErrorResponse(err)
    }
}

export async function DELETE(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const url = new URL(request.url)
        const id = url.searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

        const existing = await prisma.appointment.findFirst({
            where: { id, organizationId: session.user.organizationId }
        })
        if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

        await prisma.appointment.delete({ where: { id } })

        return NextResponse.json({ ok: true })
    } catch (err) {
        return apiErrorResponse(err)
    }
}

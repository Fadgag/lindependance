import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import apiErrorResponse from '@/lib/api'
import { CreateAppointmentSchema } from '@/schemas/appointments'
import { auth } from "@/auth"

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

        // Correction de la logique de date pour inclure toute la journée
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

        return NextResponse.json(appointments.map((a) => ({
            id: a.id,
            title: `${a.customer?.firstName || 'Client'} ${a.customer?.lastName || ''} — ${a.service?.name || 'Service'}`,
            start: a.startTime.toISOString(),
            end: a.endTime.toISOString(),
            status: a.status || "CONFIRMED",
            // --- AJOUT ESSENTIEL POUR LE CA ---
            finalPrice: a.finalPrice ? Number(a.finalPrice) : 0,
            // ----------------------------------
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
            extendedProps: {
                serviceId: a.serviceId,
                customerId: a.customerId,
                note: a.note || null,
                duration: a.duration,
                status: a.status // Utile pour le front
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

        // Récupérer le prix actuel du service pour le copier dans appointment.price (denormalization)
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
        // If this appointment consumes a customer package, decrement sessionsRemaining atomically
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
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import apiErrorResponse from '@/lib/api'
import { z } from 'zod'
import { CreateAppointmentSchema, UpdateAppointmentSchema } from '@/schemas/appointments'
import { auth } from "@/auth"
import { parseJsonField } from '@/lib/parseAppointmentJson'
import type { Extra, SoldProduct } from '@/types/models'
import {
    createStaffAppointment,
    deleteStaffAppointment,
    updateStaffAppointment,
} from '@/services/appointmentScheduling.service'
import { CustomerPortalHttpError, SerializableConflictError } from '@/services/customerPortal.service'

function schedulingErrorResponse(error: unknown): Response {
    if (error instanceof CustomerPortalHttpError) {
        return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (error instanceof SerializableConflictError) {
        return NextResponse.json({ error: 'Conflit horaire détecté' }, { status: 409 })
    }
    return apiErrorResponse(error)
}

export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // RAISON: organizationId est string | null | undefined après le guard — on le narrow ici pour Prisma
        const organizationId = session.user.organizationId!

        const url = new URL(request.url)
        const GetQuerySchema = z.object({
            // Accept query params with timezone offset (RFC3339)
            start: z.string().datetime({ offset: true }).optional(),
            end: z.string().datetime({ offset: true }).optional(),
        })
        const queryParsed = GetQuerySchema.safeParse({
            start: url.searchParams.get('start') ?? undefined,
            end: url.searchParams.get('end') ?? undefined,
        })
        if (!queryParsed.success) return NextResponse.json({ error: 'Invalid params', details: queryParsed.error.format() }, { status: 400 })
        const { start: startParam, end: endParam } = queryParsed.data

        const where: { organizationId: string; startTime?: { gte?: Date; lte?: Date } } = {
            organizationId
        }

        if (startParam) {
            const startDate = new Date(new Date(startParam).setHours(0, 0, 0, 0))
            if (!isNaN(startDate.getTime())) {
                where.startTime = { gte: startDate }
            }
        }
        if (endParam) {
            const endDate = new Date(new Date(endParam).setHours(23, 59, 59, 999))
            if (!isNaN(endDate.getTime())) {
                where.startTime = { ...where.startTime, lte: endDate }
            }
        }

        // Use explicit select to avoid reading DB columns that may not exist until migration is applied
        const appointments = await prisma.appointment.findMany({
            where,
            select: {
              id: true,
              startTime: true,
              endTime: true,
              status: true,
              finalPrice: true,
              price: true,
              serviceId: true,
              customerId: true,
              staffId: true,
              note: true,
              duration: true,
              extras: true,
              soldProducts: true,
              paymentMethod: true,
              service: { select: { id: true, name: true, price: true, color: true } },
              customer: { select: { id: true, firstName: true, lastName: true } }
            },
        })

        return NextResponse.json(appointments
            .filter((a) => a.startTime)
            .map((a) => {
                const extrasParsed = parseJsonField<Extra>(a.extras)
                const soldParsed = parseJsonField<SoldProduct>(a.soldProducts)
                return {
                id: a.id,
                title: `${a.customer?.firstName || 'Client'} ${a.customer?.lastName || ''} — ${a.service?.name || 'Service'}`,
                start: a.startTime.toISOString(),
                end: a.endTime ? a.endTime.toISOString() : a.startTime.toISOString(),
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
                extras: extrasParsed,
                soldProducts: soldParsed,
                paymentMethod: a.paymentMethod ?? null,
                extendedProps: {
                    serviceId: a.serviceId,
                    customerId: a.customerId,
                    note: a.note || null,
                    duration: a.duration,
                    status: a.status,
                    extras: extrasParsed,
                    soldProducts: soldParsed,
                    paymentMethod: a.paymentMethod ?? null,
                }
            }}))
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

        try {
            const appointment = await createStaffAppointment({
                organizationId: session.user.organizationId,
                start: new Date(parsed.data.start),
                end: new Date(parsed.data.end),
                duration: parsed.data.duration,
                serviceId: parsed.data.serviceId,
                customerId: parsed.data.customerId,
                staffId: parsed.data.staffId,
                note: parsed.data.note,
                customerPackageId: parsed.data.customerPackageId,
            })
            return NextResponse.json(appointment)
        } catch (error: unknown) {
            return schedulingErrorResponse(error)
        }
    } catch (err) {
        return apiErrorResponse(err)
    }
}

export async function PUT(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await request.json()
        const parsed = UpdateAppointmentSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 })
        }
        const { id, start, end, duration, serviceId, customerId, staffId, note } = parsed.data

        if (!id) return NextResponse.json({ error: 'Missing appointment id' }, { status: 400 })

        try {
            const updated = await updateStaffAppointment({
                organizationId: session.user.organizationId,
                id,
                start: new Date(start),
                end: new Date(end),
                duration,
                serviceId,
                customerId,
                staffId,
                note,
            })
            if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
            return NextResponse.json(updated)
        } catch (error: unknown) {
            return schedulingErrorResponse(error)
        }
    } catch (err) {
        return apiErrorResponse(err)
    }
}

export async function DELETE(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const url = new URL(request.url)
        const DeleteBodySchema = z.object({
            id: z.string().cuid().optional(),
            from: z.string().optional(),
            confirm: z.boolean().optional(),
        })
        // Support both query params and JSON body for delete requests (some clients send body)
        let id = url.searchParams.get('id')
        let from = url.searchParams.get('from') // e.g. 'checkout'
        let confirm = url.searchParams.get('confirm') === 'true'

        // Essaie de parser le body si présent (ex: appel POST/DELETE depuis frontend avec JSON)
        try {
            const rawBody = await request.json()
            const body = DeleteBodySchema.safeParse(rawBody)
            if (body.success) {
                if (body.data.id) id = body.data.id
                if (body.data.from) from = body.data.from
                if (body.data.confirm !== undefined) confirm = Boolean(body.data.confirm)
            }
        } catch {
            // pas de body -> ok, on continue avec les query params
        }

        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

        // Valider le format CUID (cohérent avec le body path qui passe par DeleteBodySchema)
        const idValidation = z.string().cuid().safeParse(id)
        if (!idValidation.success) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
        id = idValidation.data

        // Si la suppression vient de l'encaissement, exiger une confirmation explicite
        if (from === 'checkout' && !confirm) {
            return NextResponse.json({ error: 'Confirmation requise pour suppression depuis la page encaissement' }, { status: 400 })
        }

        try {
            const deleted = await deleteStaffAppointment({
                id,
                organizationId: session.user.organizationId,
            })
            if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 })
            return NextResponse.json({ ok: true })
        } catch (error: unknown) {
            return schedulingErrorResponse(error)
        }
    } catch (err) {
        return apiErrorResponse(err)
    }
}

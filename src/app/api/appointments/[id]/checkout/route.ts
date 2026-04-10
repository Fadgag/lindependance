import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import apiErrorResponse from '@/lib/api'
import { auth } from "@/auth"
import { UpdatePaymentDetailsSchema } from '@/schemas/appointments'
import { z } from 'zod'

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth()
        if (!session?.user?.organizationId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params;
        const body = await request.json()
        const CheckoutSchema = z.object({
            totalPrice: z.number(),
            extras: z.array(z.object({ label: z.string(), price: z.number() })).optional().nullable(),
            note: z.string().optional().nullable(),
            paymentMethod: z.string().optional(),
        })
        const parsed = CheckoutSchema.safeParse(body)
        if (!parsed.success) return NextResponse.json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 })
        const { totalPrice, extras, note, paymentMethod } = parsed.data

        const updateResult = await prisma.appointment.updateMany({
            where: {
                id: id,
                organizationId: session.user.organizationId
            },
            data: {
                status: "PAID",
                finalPrice: totalPrice,
                extras: extras ? JSON.stringify(extras) : null,
                note: note,             // Bien en minuscule ici
                paymentMethod: paymentMethod,
                updatedAt: new Date(),
            },
        })

        if (updateResult.count === 0) {
            return NextResponse.json({ error: 'Non trouvé' }, { status: 404 })
        }

        return NextResponse.json({ success: true })
    } catch (err) {
        return apiErrorResponse(err)
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth()
        if (!session?.user?.organizationId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const body = await request.json()
        const parsed = UpdatePaymentDetailsSchema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json({ error: 'Données invalides', details: parsed.error.format() }, { status: 400 })
        }

        // IDOR + guard : seul un RDV PAID de cette organisation peut être modifié
        const result = await prisma.appointment.updateMany({
            where: {
                id,
                organizationId: session.user.organizationId,
                status: 'PAID',
            },
            data: {
                paymentMethod: parsed.data.paymentMethod,
                note: parsed.data.note ?? null,
                updatedAt: new Date(),
            },
        })

        if (result.count === 0) {
            return NextResponse.json({ error: 'Rendez-vous introuvable ou non encaissé' }, { status: 404 })
        }

        return NextResponse.json({ ok: true })
    } catch (err) {
        return apiErrorResponse(err)
    }
}

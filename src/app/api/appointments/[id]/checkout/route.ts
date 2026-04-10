import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from "@/auth"
import { logger } from '@/lib/logger'

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
        const { totalPrice, extras, note, paymentMethod } = await request.json()

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
        logger.error('Checkout Error:', err)
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }
}
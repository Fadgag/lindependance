import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from "@/auth"
import { logger } from '@/lib/logger'
import { CheckoutInputSchema } from '@/schemas/appointments'

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
        // session.user.organizationId may be typed as string | null | undefined.
        // We guarded above that it exists, so narrow it to a plain string for Prisma queries.
        const organizationId: string = session.user.organizationId as string;
        const body = await request.json()
        const parsed = CheckoutInputSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ error: 'Données invalides', details: parsed.error.format() }, { status: 400 })
        }
        const { totalPrice, extras, note, paymentMethod, soldProducts } = parsed.data

        // Apply stock decrement and update appointment atomically
        await prisma.$transaction(async (tx) => {
            if (Array.isArray(soldProducts) && soldProducts.length > 0) {
                for (const line of soldProducts) {
                    const qty = Number(line.quantity || 0)
                    if (qty <= 0) continue
                    const res = await tx.product.updateMany({
                        where: { id: line.productId, organizationId: organizationId, stock: { gte: qty } },
                        data: { stock: { decrement: qty } }
                    })
                    if (res.count === 0) {
                        throw new Error(`INSUFFICIENT_STOCK:${line.productId}`)
                    }
                }
            }

            const updateResult = await tx.appointment.updateMany({
                where: {
                    id: id,
                    organizationId: organizationId
                },
                data: {
                    status: "PAID",
                    finalPrice: totalPrice,
                    extras: extras ? JSON.stringify(extras) : null,
                    soldProducts: soldProducts ? JSON.stringify(soldProducts) : null,
                    note: note,
                    paymentMethod: paymentMethod,
                    updatedAt: new Date(),
                },
            })

            if (updateResult.count === 0) {
                throw new Error('NOT_FOUND')
            }
        })

        return NextResponse.json({ success: true })
    } catch (err) {
        logger.error('Checkout Error:', err)
        const msg = (err instanceof Error && err.message) ? err.message : 'Erreur serveur'
        if (typeof msg === 'string' && msg.startsWith('INSUFFICIENT_STOCK:')) {
            const productId = msg.split(':')[1]
            return NextResponse.json({ error: 'Stock insuffisant', productId }, { status: 409 })
        }
        if (msg === 'NOT_FOUND') return NextResponse.json({ error: 'Non trouvé' }, { status: 404 })
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }
}
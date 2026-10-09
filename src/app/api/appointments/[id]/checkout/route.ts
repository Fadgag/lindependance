import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from "@/auth"
import { logger } from '@/lib/logger'
import { CheckoutInputSchema } from '@/schemas/appointments'
import { rejectPendingRequestsForAppointment } from '@/services/appointmentChangeRequests.service'
import { computeCheckoutTotal, computeSoldProductLine } from '@/domain/billing/vat'
import { isAppointmentPaid } from '@/domain/appointment/policies'
import { ProductStockMovementType } from '@prisma/client'
import { applyProductStockMovement } from '@/services/productStock.service'

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
        if ((parsed.data.extras?.length ?? 0) > 0 && session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
        const { extras, note, paymentMethod, soldProducts } = parsed.data

        await prisma.$transaction(async (tx) => {
            const appointment = await tx.appointment.findFirst({
                where: { id, organizationId },
                select: {
                    status: true,
                    finalPrice: true,
                    service: { select: { organizationId: true, price: true } },
                },
            })
            if (!appointment || appointment.service.organizationId !== organizationId) {
                throw new Error('NOT_FOUND')
            }
            if (isAppointmentPaid(appointment)) {
                throw new Error('ALREADY_PAID')
            }

            const requestedProducts = soldProducts ?? []
            const productIds = [...new Set(requestedProducts.map((line) => line.productId))]
            const products = productIds.length > 0
                ? await tx.product.findMany({
                    where: { id: { in: productIds }, organizationId },
                    select: { id: true, name: true, iconName: true, priceTTC: true, taxRate: true },
                })
                : []
            const productsById = new Map(products.map((product) => [product.id, product]))
            const persistedSoldProducts = requestedProducts.map((line) => {
                const product = productsById.get(line.productId)
                if (!product) throw new Error('PRODUCT_NOT_FOUND')

                const { totalTTC, totalTax } = computeSoldProductLine(
                    product.priceTTC,
                    line.quantity,
                    product.taxRate,
                )
                return {
                    productId: product.id,
                    name: product.name,
                    iconName: product.iconName,
                    quantity: line.quantity,
                    priceTTC: product.priceTTC,
                    taxRate: product.taxRate,
                    totalTTC,
                    totalTax,
                }
            })

            for (const line of persistedSoldProducts) {
                const movement = await applyProductStockMovement(tx, {
                    productId: line.productId,
                    organizationId,
                    type: ProductStockMovementType.SALE,
                    quantityDelta: -line.quantity,
                    appointmentId: id,
                })
                if (movement.status === 'insufficient-stock') {
                    throw new Error(`INSUFFICIENT_STOCK:${line.productId}`)
                }
                if (movement.status === 'product-not-found') throw new Error('PRODUCT_NOT_FOUND')
            }

            const finalPrice = computeCheckoutTotal(
                Number(appointment.service.price),
                (extras ?? []).map((extra) => extra.price),
                persistedSoldProducts.map((product) => product.totalTTC),
            )
            const updateResult = await tx.appointment.updateMany({
                where: {
                    id,
                    organizationId,
                    AND: [
                        { status: { notIn: ['PAID', 'PAYED'] } },
                        { OR: [{ finalPrice: null }, { finalPrice: { lte: 0 } }] },
                    ],
                },
                data: {
                    status: "PAID",
                    finalPrice,
                    extras: extras ? JSON.stringify(extras) : null,
                    soldProducts: persistedSoldProducts.length > 0
                        ? JSON.stringify(persistedSoldProducts)
                        : null,
                    note: note,
                    paymentMethod: paymentMethod,
                    updatedAt: new Date(),
                },
            })

            if (updateResult.count === 0) {
                throw new Error('ALREADY_PAID')
            }

            await rejectPendingRequestsForAppointment(tx, {
                appointmentId: id,
                organizationId,
                now: new Date(),
                reviewReason: 'Le rendez-vous a été clôturé après le paiement.',
            })
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
        if (msg === 'PRODUCT_NOT_FOUND') return NextResponse.json({ error: 'Produit non trouvé' }, { status: 409 })
        if (msg === 'ALREADY_PAID') return NextResponse.json({ error: 'Rendez-vous déjà payé' }, { status: 409 })
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }
}
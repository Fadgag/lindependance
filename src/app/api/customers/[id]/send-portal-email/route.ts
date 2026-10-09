import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { sendCustomerPortalSavedEmail } from '@/services/customerPortalEmail.service'

const CustomerIdSchema = z.string().trim().min(1)

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth()
    const organizationId = session?.user?.organizationId
    if (!organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: rawCustomerId } = await params
    const parsedCustomerId = CustomerIdSchema.safeParse(rawCustomerId)
    if (!parsedCustomerId.success) {
      return NextResponse.json({ error: 'Identifiant client invalide.' }, { status: 400 })
    }

    const customer = await prisma.customer.findFirst({
      where: {
        id: parsedCustomerId.data,
        organizationId,
      },
      select: {
        email: true,
        organization: {
          select: {
            name: true,
            slug: true,
            portalEnabled: true,
          },
        },
      },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Fiche client introuvable.' }, { status: 404 })
    }
    if (!customer.email) {
      return NextResponse.json({ error: 'Aucune adresse e-mail n’est enregistrée dans cette fiche.' }, { status: 409 })
    }
    if (!customer.organization.portalEnabled || !customer.organization.slug) {
      return NextResponse.json({ error: 'Le portail de réservation n’est pas activé pour cette organisation.' }, { status: 409 })
    }

    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? new URL(request.url).origin)
      .replace(/\/+$/, '')
    const portalUrl = `${baseUrl}/portail/${encodeURIComponent(customer.organization.slug)}/reserver`

    await sendCustomerPortalSavedEmail({
      to: customer.email,
      organizationName: customer.organization.name,
      portalUrl,
    })

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    logger.error('Customer reservation information email failed', error)
    return NextResponse.json({ error: 'Impossible d’envoyer l’e-mail au client.' }, { status: 500 })
  }
}

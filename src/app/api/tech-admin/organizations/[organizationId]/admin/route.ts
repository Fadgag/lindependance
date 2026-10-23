import { NextResponse } from 'next/server'
import { canProvisionTestSalon } from '@/domain/tech-admin/testSalonProvisioning'
import { apiErrorResponse } from '@/lib/api'
import { getTestCampaignAdminAccess } from '@/lib/testCampaignAccess'
import {
  CreateInitialOrganizationAdminSchema,
} from '@/schemas/techAdmin'
import { sendStaffActivationEmail } from '@/services/staffActivationEmail.service'
import { createInitialOrganizationAdmin } from '@/services/userAccounts.service'

type InitialAdminRouteContext = {
  params: Promise<{ organizationId: string }>
}

export async function POST(request: Request, context: InitialAdminRouteContext) {
  if (!canProvisionTestSalon({
    vercelEnvironment: process.env.VERCEL_ENV,
    gitCommitRef: process.env.VERCEL_GIT_COMMIT_REF,
  })) {
    return NextResponse.json({
      error: 'La création du premier compte ADMIN est réservée à la préproduction sur la branche preprod.',
    }, { status: 404 })
  }

  try {
    const access = await getTestCampaignAdminAccess()
    if (!access.authorized) {
      return NextResponse.json({ error: 'Accès réservé aux administrateurs techniques.' }, { status: access.status })
    }

    const { organizationId } = await context.params
    const parsedOrganizationId = typeof organizationId === 'string'
      ? organizationId.trim()
      : ''
    if (!parsedOrganizationId || parsedOrganizationId.length > 128) {
      return NextResponse.json({ error: 'Identifiant de salon invalide.' }, { status: 400 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Corps JSON invalide.' }, { status: 400 })
    }
    const parsed = CreateInitialOrganizationAdminSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Les données du compte sont invalides.' }, { status: 400 })
    }

    const result = await createInitialOrganizationAdmin({
      actorId: access.session.user.id,
      organizationId: parsedOrganizationId,
      email: parsed.data.email,
    })
    if (result.kind === 'organization_not_found') {
      return NextResponse.json({ error: 'Le salon sélectionné est introuvable.' }, { status: 404 })
    }
    if (result.kind === 'admin_exists') {
      return NextResponse.json({ error: 'Ce salon possède déjà un compte ADMIN.' }, { status: 409 })
    }
    if (result.kind === 'actor_forbidden') {
      return NextResponse.json({ error: 'Accès réservé aux administrateurs techniques.' }, { status: 403 })
    }
    if (result.kind === 'email_exists') {
      return NextResponse.json({ error: 'Cette adresse e-mail est déjà associée à un compte.' }, { status: 409 })
    }

    const invitation = await sendStaffActivationEmail({
      email: result.account.email,
      organizationName: result.organizationName,
    })
    return NextResponse.json({
      organization: {
        id: parsedOrganizationId,
        name: result.organizationName,
      },
      account: {
        id: result.account.id,
        email: result.account.email,
        role: 'ADMIN',
      },
      invitation,
    }, {
      status: 201,
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch (error: unknown) {
    return apiErrorResponse(error)
  }
}

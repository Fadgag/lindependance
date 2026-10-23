import { NextResponse } from 'next/server'
import { apiErrorResponse } from '@/lib/api'
import { getOrganizationAdminAccess } from '@/lib/organizationAdminAccess'
import { CreateOrganizationAccountSchema } from '@/schemas/userAccounts'
import {
  createOrganizationAccount,
  listOrganizationAccounts,
} from '@/services/userAccounts.service'
import { sendStaffActivationEmail } from '@/services/staffActivationEmail.service'

const PRIVATE_NO_STORE = { 'Cache-Control': 'private, no-store' }

export async function GET() {
  try {
    const access = await getOrganizationAdminAccess()
    if (!access.authorized) {
      return NextResponse.json(
        { error: access.status === 401 ? 'Unauthorized' : 'Forbidden' },
        { status: access.status },
      )
    }

    return NextResponse.json(await listOrganizationAccounts(access.organizationId), {
      headers: PRIVATE_NO_STORE,
    })
  } catch (error: unknown) {
    return apiErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const access = await getOrganizationAdminAccess()
    if (!access.authorized) {
      return NextResponse.json(
        { error: access.status === 401 ? 'Unauthorized' : 'Forbidden' },
        { status: access.status },
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Corps JSON invalide.' }, { status: 400 })
    }
    const parsed = CreateOrganizationAccountSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Les données du compte sont invalides.' }, { status: 400 })
    }

    const result = await createOrganizationAccount({
      actorId: access.userId,
      organizationId: access.organizationId,
      email: parsed.data.email,
      name: parsed.data.name,
      role: parsed.data.role,
    })
    if (result.kind === 'email_exists') {
      return NextResponse.json({ error: 'Cette adresse e-mail est déjà associée à un compte.' }, { status: 409 })
    }
    if (result.kind === 'organization_not_found') {
      return NextResponse.json({ error: 'Le salon associé à ce compte est introuvable.' }, { status: 404 })
    }
    if (result.kind === 'actor_forbidden') {
      return NextResponse.json({ error: 'Accès réservé aux administrateurs du salon.' }, { status: 403 })
    }

    const invitation = await sendStaffActivationEmail({
      email: result.account.email,
      organizationName: result.organizationName,
    })
    return NextResponse.json({
      account: result.account,
      invitation,
    }, {
      status: 201,
      headers: PRIVATE_NO_STORE,
    })
  } catch (error: unknown) {
    return apiErrorResponse(error)
  }
}

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import apiErrorResponse from '@/lib/api'
import { CustomerPortalSettingsSchema } from '@/schemas/customerPortal'
import {
  getOrganizationPortalSettings,
  updateOrganizationPortalSettings,
} from '@/services/customerPortalSettings.service'

async function getStaffOrganizationId(): Promise<{ id: string } | Response> {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user?.accountType !== 'STAFF') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!session.user.organizationId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return { id: session.user.organizationId }
}

function isSlugConflict(error: unknown): boolean {
  return Boolean(
    error
    && typeof error === 'object'
    && 'code' in error
    && error.code === 'P2002',
  )
}

export async function GET(_request?: Request) {
  void _request
  try {
    const organization = await getStaffOrganizationId()
    if (organization instanceof Response) return organization

    const settings = await getOrganizationPortalSettings(organization.id)
    if (!settings) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    return NextResponse.json(settings)
  } catch (error: unknown) {
    return apiErrorResponse(error)
  }
}

export async function PATCH(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = CustomerPortalSettingsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid portal settings', details: parsed.error.format() }, { status: 400 })
  }

  try {
    const organization = await getStaffOrganizationId()
    if (organization instanceof Response) return organization

    const result = await updateOrganizationPortalSettings({
      organizationId: organization.id,
      settings: parsed.data,
    })
    if (result.status === 'not_found') {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }
    if (result.status === 'practitioner_required') {
      return NextResponse.json({
        error: 'Ajoutez au moins une personne dans l’équipe avant d’activer les réservations en ligne.',
      }, { status: 400 })
    }
    if (result.status === 'contact_required') {
      return NextResponse.json({
        error: 'Renseignez un téléphone ou un e-mail public avant d’activer le portail.',
      }, { status: 400 })
    }
    if (result.status !== 'updated') {
      return NextResponse.json({ error: 'Impossible d’activer le portail.' }, { status: 400 })
    }
    return NextResponse.json(result.settings)
  } catch (error: unknown) {
    if (isSlugConflict(error)) {
      return NextResponse.json({ error: 'Ce slug est déjà utilisé' }, { status: 409 })
    }
    return apiErrorResponse(error)
  }
}

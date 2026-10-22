import { NextResponse } from 'next/server'
import { normalizePortalHostname } from '@/domain/customer-portal/portalDomains'
import apiErrorResponse from '@/lib/api'
import { getTestCampaignAdminAccess } from '@/lib/testCampaignAccess'
import {
  CreateTechAdminPortalDomainSchema,
  TechAdminPortalDomainMutationResponseSchema,
} from '@/schemas/techAdmin'
import {
  createTechAdminPortalDomain,
  CustomerPortalDomainConfigurationError,
  listTechAdminPortalDomains,
} from '@/services/customerPortalDomains.service'

export async function GET() {
  try {
    const access = await getTestCampaignAdminAccess()
    if (!access.authorized) {
      return NextResponse.json({ error: 'Accès réservé aux administrateurs techniques.' }, { status: access.status })
    }
    return NextResponse.json(await listTechAdminPortalDomains(), {
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch (error: unknown) {
    return apiErrorResponse(error)
  }
}

export async function POST(request: Request) {
  let access: Awaited<ReturnType<typeof getTestCampaignAdminAccess>>
  try {
    access = await getTestCampaignAdminAccess()
  } catch (error: unknown) {
    return apiErrorResponse(error)
  }
  if (!access.authorized) {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs techniques.' }, { status: access.status })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide.' }, { status: 400 })
  }
  const parsed = CreateTechAdminPortalDomainSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Les informations du domaine sont invalides.' }, { status: 400 })
  }
  const hostname = normalizePortalHostname(parsed.data.hostname)
  if (!hostname) {
    return NextResponse.json({ error: 'Saisissez un nom de domaine valide.' }, { status: 400 })
  }

  try {
    const created = await createTechAdminPortalDomain({
      hostname,
      organizationId: parsed.data.organizationId,
    })
    const result = TechAdminPortalDomainMutationResponseSchema.safeParse(created)
    if (!result.success) {
      throw new Error('La réponse de création du domaine est invalide.')
    }
    return NextResponse.json(result.data, {
      status: 201,
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch (error: unknown) {
    if (error instanceof CustomerPortalDomainConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return apiErrorResponse(error)
  }
}

import { NextResponse } from 'next/server'
import { z } from 'zod'
import apiErrorResponse from '@/lib/api'
import { getTestCampaignAdminAccess } from '@/lib/testCampaignAccess'
import { deleteTechAdminPortalDomain } from '@/services/customerPortalDomains.service'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const access = await getTestCampaignAdminAccess()
    if (!access.authorized) {
      return NextResponse.json({ error: 'Accès réservé aux administrateurs techniques.' }, { status: access.status })
    }

    const { id } = await context.params
    const parsedId = z.string().trim().min(1).max(128).safeParse(id)
    if (!parsedId.success) {
      return NextResponse.json({ error: 'Identifiant de domaine invalide.' }, { status: 400 })
    }
    const deleted = await deleteTechAdminPortalDomain(parsedId.data)
    if (!deleted) return NextResponse.json({ error: 'Association introuvable.' }, { status: 404 })
    return new Response(null, { status: 204 })
  } catch (error: unknown) {
    return apiErrorResponse(error)
  }
}

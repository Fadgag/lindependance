import { NextResponse } from 'next/server'
import { apiErrorResponse } from '@/lib/api'
import { getTestCampaignAdminAccess } from '@/lib/testCampaignAccess'
import { CampaignIdSchema, CloseTestCampaignSchema } from '@/schemas/testFeedback'
import { closeTestCampaign, getTestCampaignDetail } from '@/services/testFeedback.service'

type CampaignRouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: CampaignRouteContext) {
  try {
    const access = await getTestCampaignAdminAccess()
    if (!access.authorized) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: access.status })
    }
    const parsedId = CampaignIdSchema.safeParse((await params).id)
    if (!parsedId.success) return NextResponse.json({ error: 'Campagne introuvable' }, { status: 404 })
    const campaign = await getTestCampaignDetail(parsedId.data)
    if (!campaign) return NextResponse.json({ error: 'Campagne introuvable' }, { status: 404 })
    return NextResponse.json(campaign)
  } catch (error: unknown) {
    return apiErrorResponse(error)
  }
}

export async function PATCH(request: Request, { params }: CampaignRouteContext) {
  let access: Awaited<ReturnType<typeof getTestCampaignAdminAccess>>
  try {
    access = await getTestCampaignAdminAccess()
  } catch (error: unknown) {
    return apiErrorResponse(error)
  }
  if (!access.authorized) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: access.status })
  }

  const parsedId = CampaignIdSchema.safeParse((await params).id)
  if (!parsedId.success) return NextResponse.json({ error: 'Campagne introuvable' }, { status: 404 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 })
  }
  const parsedBody = CloseTestCampaignSchema.safeParse(body)
  if (!parsedBody.success) {
    return NextResponse.json({ error: 'Action de campagne invalide' }, { status: 400 })
  }

  try {
    const result = await closeTestCampaign(parsedId.data)
    if (result === 'not_found') return NextResponse.json({ error: 'Campagne introuvable' }, { status: 404 })
    if (result === 'already_closed') {
      return NextResponse.json({ error: 'Cette campagne est déjà clôturée' }, { status: 409 })
    }
    return NextResponse.json({ status: parsedBody.data.status })
  } catch (error: unknown) {
    return apiErrorResponse(error)
  }
}

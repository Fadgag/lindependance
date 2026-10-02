import { NextResponse } from 'next/server'
import { apiErrorResponse } from '@/lib/api'
import { getTestCampaignAdminAccess } from '@/lib/testCampaignAccess'
import { CreateTestCampaignSchema } from '@/schemas/testFeedback'
import { createTestCampaign, listTestCampaigns } from '@/services/testFeedback.service'

export async function GET() {
  try {
    const access = await getTestCampaignAdminAccess()
    if (!access.authorized) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: access.status })
    }
    return NextResponse.json(await listTestCampaigns())
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
    return NextResponse.json({ error: 'Accès refusé' }, { status: access.status })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 })
  }

  const parsed = CreateTestCampaignSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Informations de campagne invalides' }, { status: 400 })
  }

  try {
    const campaign = await createTestCampaign(parsed.data)
    if (!campaign) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 404 })
    return NextResponse.json(campaign, { status: 201 })
  } catch (error: unknown) {
    return apiErrorResponse(error)
  }
}

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { apiErrorResponse } from '@/lib/api'
import { getTestCampaignAdminAccess } from '@/lib/testCampaignAccess'
import { listTestCampaignRecipients } from '@/services/testFeedback.service'

const RecipientQuerySchema = z.object({
  organizationId: z.string().min(1).max(64),
})

export async function GET(request: Request) {
  try {
    const access = await getTestCampaignAdminAccess()
    if (!access.authorized) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: access.status })
    }

    const parsed = RecipientQuerySchema.safeParse({
      organizationId: new URL(request.url).searchParams.get('organizationId'),
    })
    if (!parsed.success) {
      return NextResponse.json({ error: 'Organisation invalide' }, { status: 400 })
    }

    return NextResponse.json(await listTestCampaignRecipients(parsed.data.organizationId))
  } catch (error: unknown) {
    return apiErrorResponse(error)
  }
}

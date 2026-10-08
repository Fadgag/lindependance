import { NextResponse } from 'next/server'
import { apiErrorResponse } from '@/lib/api'
import { getTestCampaignAdminAccess } from '@/lib/testCampaignAccess'
import { listTechAdminOrganizations } from '@/services/techAdmin.service'

export async function GET() {
  try {
    const access = await getTestCampaignAdminAccess()
    if (!access.authorized) {
      return NextResponse.json({ error: 'Accès réservé aux administrateurs techniques.' }, { status: access.status })
    }
    return NextResponse.json(await listTechAdminOrganizations(), {
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch (error: unknown) {
    return apiErrorResponse(error)
  }
}

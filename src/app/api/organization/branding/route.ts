import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import apiErrorResponse from '@/lib/api'
import { organizationBrandingUpdateSchema } from '@/domain/branding/logoSettings'
import {
  getOrganizationBranding,
  updateOrganizationBranding,
} from '@/services/organizationBranding.service'

export async function GET() {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const organizationId = session.user?.organizationId
    if (!organizationId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const branding = await getOrganizationBranding(organizationId)
    return NextResponse.json(branding)
  } catch (error) {
    return apiErrorResponse(error)
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user?.role !== 'ADMIN' || !session.user.organizationId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parsed = organizationBrandingUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 })
    }

    const branding = await updateOrganizationBranding(session.user.organizationId, parsed.data)
    return NextResponse.json(branding)
  } catch (error) {
    return apiErrorResponse(error)
  }
}

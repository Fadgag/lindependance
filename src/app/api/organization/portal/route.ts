import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import apiErrorResponse from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { CustomerPortalSettingsSchema } from '@/schemas/customerPortal'

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

    const settings = await prisma.organization.findUnique({
      where: { id: organization.id },
      select: { slug: true, portalEnabled: true, timezone: true },
    })
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

    const updated = await prisma.organization.update({
      where: { id: organization.id },
      data: parsed.data,
      select: { slug: true, portalEnabled: true, timezone: true },
    })
    return NextResponse.json(updated)
  } catch (error: unknown) {
    if (isSlugConflict(error)) {
      return NextResponse.json({ error: 'Ce slug est déjà utilisé' }, { status: 409 })
    }
    return apiErrorResponse(error)
  }
}

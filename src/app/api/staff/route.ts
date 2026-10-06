import { NextResponse } from 'next/server'
import apiErrorResponse from '@/lib/api'
import { auth } from '@/auth'
import {
  StaffAppointmentCountSchema,
  StaffCreateSchema,
  StaffIdSchema,
  StaffUpdateSchema,
} from '@/schemas/staff'
import {
  archiveOrganizationStaff,
  createOrganizationStaff,
  listOrganizationStaff,
  updateOrganizationStaff,
} from '@/services/staff.service'

export async function GET(_request: Request) {
  void _request
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const organizationId = session.user?.organizationId
    if (!organizationId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const staff = await listOrganizationStaff(organizationId)
    const resources = staff.map((person) => ({
      ...person,
      title: `${person.firstName} ${person.lastName}`.trim(),
    }))
    return NextResponse.json(resources)
  } catch (err) {
    return apiErrorResponse(err)
  }
}

type StaffAdminSession = {
  user?: {
    role?: string | null
    organizationId?: string | null
  }
} | null

function getAdminOrganizationId(session: StaffAdminSession) {
  if (!session) return { error: 'Unauthorized', status: 401 as const }
  if (session.user?.role !== 'ADMIN' || !session.user.organizationId) {
    return { error: 'Forbidden', status: 403 as const }
  }
  return { organizationId: session.user.organizationId }
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = StaffCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid practitioner details' }, { status: 400 })
  }

  try {
    const access = getAdminOrganizationId(await auth())
    if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status })

    const practitioner = await createOrganizationStaff({
      organizationId: access.organizationId,
      ...parsed.data,
    })
    return NextResponse.json(practitioner, { status: 201 })
  } catch (error: unknown) {
    return apiErrorResponse(error)
  }
}

export async function PUT(request: Request) {
  const url = new URL(request.url)
  const id = StaffIdSchema.safeParse(url.searchParams.get('id'))
  if (!id.success) return NextResponse.json({ error: 'Invalid practitioner id' }, { status: 400 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = StaffUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid practitioner details' }, { status: 400 })
  }

  try {
    const access = getAdminOrganizationId(await auth())
    if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status })

    const updated = await updateOrganizationStaff({
      id: id.data,
      organizationId: access.organizationId,
      ...parsed.data,
    })
    if (updated.status === 'not_found') {
      return NextResponse.json({ error: 'Practitioner not found' }, { status: 404 })
    }
    return NextResponse.json({
      success: true,
      portalDisabled: updated.portalDisabled,
      notificationSent: updated.notificationSent,
    })
  } catch (error: unknown) {
    return apiErrorResponse(error)
  }
}

export async function DELETE(request: Request) {
  const url = new URL(request.url)
  const id = StaffIdSchema.safeParse(url.searchParams.get('id'))
  if (!id.success) return NextResponse.json({ error: 'Invalid practitioner id' }, { status: 400 })
  const expectedAppointmentCount = StaffAppointmentCountSchema.safeParse(
    url.searchParams.get('expectedAppointmentCount') ?? undefined,
  )
  if (!expectedAppointmentCount.success) {
    return NextResponse.json({ error: 'Invalid appointment count' }, { status: 400 })
  }

  try {
    const access = getAdminOrganizationId(await auth())
    if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status })

    const result = await archiveOrganizationStaff({
      id: id.data,
      organizationId: access.organizationId,
      ...(expectedAppointmentCount.data !== undefined
        ? { expectedAppointmentCount: expectedAppointmentCount.data }
        : {}),
    })
    if (result.status === 'not_found') {
      return NextResponse.json({ error: 'Practitioner not found' }, { status: 404 })
    }
    if (result.status === 'confirmation_required') {
      return NextResponse.json({
        error: 'Appointments are linked to this practitioner',
        appointmentCount: result.appointmentCount,
      }, { status: 409 })
    }
    return NextResponse.json({
      success: true,
      appointmentCount: result.appointmentCount,
      portalDisabled: result.portalDisabled,
      notificationSent: result.notificationSent,
    })
  } catch (error: unknown) {
    return apiErrorResponse(error)
  }
}

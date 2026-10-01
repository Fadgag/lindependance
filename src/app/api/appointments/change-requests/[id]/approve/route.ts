import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import apiErrorResponse from '@/lib/api'
import { AppointmentChangeRequestIdSchema } from '@/schemas/customerPortal'
import {
  CustomerPortalHttpError,
  SerializableConflictError,
} from '@/services/customerPortal.service'
import { approveAppointmentChangeRequest } from '@/services/appointmentChangeRequests.service'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(_request: Request, context: RouteContext) {
  const session = await auth()
  const organizationId = session?.user?.organizationId
  const reviewerId = session?.user?.id
  if (!organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.accountType !== 'STAFF') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!reviewerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await context.params
  const parsedId = AppointmentChangeRequestIdSchema.safeParse(id)
  if (!parsedId.success) return NextResponse.json({ error: 'Invalid request id' }, { status: 400 })

  try {
    await approveAppointmentChangeRequest({
      requestId: parsedId.data,
      organizationId,
      reviewerId,
    })
    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    if (error instanceof CustomerPortalHttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (error instanceof SerializableConflictError) {
      return NextResponse.json({ error: 'Conflit lors du traitement, réessayez.' }, { status: 409 })
    }
    return apiErrorResponse(error)
  }
}

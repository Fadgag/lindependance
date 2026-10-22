import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import apiErrorResponse from '@/lib/api'
import { AppointmentChangeRequestIdSchema } from '@/schemas/customerPortal'
import {
  CustomerPortalHttpError,
  SerializableConflictError,
} from '@/services/customerPortal.service'
import { approveAppointmentChangeRequest } from '@/services/appointmentChangeRequests.service'
import { sendAppointmentChangeDecisionNotification } from '@/services/appointmentChangeNotification.service'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, context: RouteContext) {
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
    const decision = await approveAppointmentChangeRequest({
      requestId: parsedId.data,
      organizationId,
      reviewerId,
    })
    const notification = await sendAppointmentChangeDecisionNotification({
      decision,
      requestOrigin: new URL(request.url).origin,
    })
    return NextResponse.json({ ok: true, ...notification })
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

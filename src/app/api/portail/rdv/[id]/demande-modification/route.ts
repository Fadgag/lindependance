import { NextResponse } from 'next/server'
import apiErrorResponse from '@/lib/api'
import {
  AppointmentChangeRequestIdSchema,
  CustomerPortalChangeRequestSchema,
} from '@/schemas/customerPortal'
import {
  getCustomerPortalSession,
  isCustomerPortalHttpError,
  SerializableConflictError,
} from '@/services/customerPortal.service'
import { createCustomerPortalChangeRequest } from '@/services/appointmentChangeRequests.service'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, context: RouteContext) {
  const origin = request.headers.get('origin')
  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(request.url).origin) {
        return NextResponse.json({ error: 'Cross-origin request denied' }, { status: 403 })
      }
    } catch {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
    }
  }

  const session = getCustomerPortalSession(request)
  if (!session || session.accountType !== 'CUSTOMER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params
  const parsedId = AppointmentChangeRequestIdSchema.safeParse(id)
  if (!parsedId.success) {
    return NextResponse.json({ error: 'Invalid appointment id' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const parsedBody = CustomerPortalChangeRequestSchema.safeParse(body)
  if (!parsedBody.success) {
    return NextResponse.json({ error: 'Invalid change request' }, { status: 400 })
  }

  try {
    const changeRequest = await createCustomerPortalChangeRequest({
      appointmentId: parsedId.data,
      organizationId: session.organizationId,
      verifiedEmail: session.verifiedEmail,
      requestedStart: parsedBody.data.requestedStart,
      reason: parsedBody.data.reason,
    })
    return NextResponse.json(changeRequest, { status: 201 })
  } catch (error: unknown) {
    if (isCustomerPortalHttpError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (error instanceof SerializableConflictError) {
      return NextResponse.json({ error: 'Conflit lors de la demande, réessayez.' }, { status: 409 })
    }
    return apiErrorResponse(error)
  }
}

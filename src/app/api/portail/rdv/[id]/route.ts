import { NextResponse } from 'next/server'
import apiErrorResponse from '@/lib/api'
import { CustomerPortalAppointmentIdSchema } from '@/schemas/customerPortal'
import {
  getCustomerPortalSession,
  isCustomerPortalHttpError,
  SerializableConflictError,
} from '@/services/customerPortal.service'
import { cancelCustomerPortalAppointment } from '@/services/customerPortalAppointments.service'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function DELETE(request: Request, context: RouteContext) {
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
  const parsedId = CustomerPortalAppointmentIdSchema.safeParse(id)
  if (!parsedId.success) {
    return NextResponse.json({ error: 'Invalid appointment id' }, { status: 400 })
  }

  try {
    await cancelCustomerPortalAppointment({
      appointmentId: parsedId.data,
      organizationId: session.organizationId,
      verifiedEmail: session.verifiedEmail,
    })
    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    if (isCustomerPortalHttpError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (error instanceof SerializableConflictError) {
      return NextResponse.json({ error: 'Conflit lors de l’annulation, réessayez.' }, { status: 409 })
    }
    return apiErrorResponse(error)
  }
}

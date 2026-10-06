import { NextResponse } from 'next/server'
import apiErrorResponse from '@/lib/api'
import { logger } from '@/lib/logger'
import { getCustomerPortalSession, isCustomerPortalHttpError } from '@/services/customerPortal.service'
import { getAppointmentConfirmationForCustomer } from '@/services/customerPortalBooking.service'
import { sendAppointmentConfirmation } from '@/services/customerPortalEmail.service'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, context: RouteContext) {
  const session = await getCustomerPortalSession(request)
  if (!session || session.accountType !== 'CUSTOMER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params
  if (!id) return NextResponse.json({ error: 'Invalid appointment id' }, { status: 400 })

  let confirmation
  try {
    confirmation = await getAppointmentConfirmationForCustomer({
      appointmentId: id,
      organizationId: session.organizationId,
      verifiedEmail: session.verifiedEmail,
    })
  } catch (error: unknown) {
    if (isCustomerPortalHttpError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return apiErrorResponse(error)
  }

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? new URL(request.url).origin)
    .replace(/\/+$/, '')
  const portalUrl = `${baseUrl}/portail/${encodeURIComponent(confirmation.organizationSlug)}/reserver`
  try {
    await sendAppointmentConfirmation({
      to: confirmation.email,
      appointment: { ...confirmation.appointment, portalUrl },
    })
  } catch (error: unknown) {
    logger.error('Customer portal confirmation resend failed', {
      appointmentId: id,
      error,
    })
    return NextResponse.json({ error: 'Confirmation email unavailable' }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}

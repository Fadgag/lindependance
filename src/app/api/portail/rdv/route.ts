import { NextResponse } from 'next/server'
import apiErrorResponse from '@/lib/api'
import { logger } from '@/lib/logger'
import {
  CustomerPortalAppointmentsSchema,
  CustomerPortalBookingSchema,
} from '@/schemas/customerPortal'
import {
  getCustomerPortalSession,
  isCustomerPortalHttpError,
  SerializableConflictError,
} from '@/services/customerPortal.service'
import { getCustomerPortalAppointments } from '@/services/customerPortalAppointments.service'
import { createCustomerPortalAppointment } from '@/services/customerPortalBooking.service'
import { sendAppointmentConfirmation } from '@/services/customerPortalEmail.service'

export async function GET(request: Request) {
  const session = await getCustomerPortalSession(request)
  if (!session || session.accountType !== 'CUSTOMER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await getCustomerPortalAppointments({
      organizationId: session.organizationId,
      verifiedEmail: session.verifiedEmail,
    })
    const payload = CustomerPortalAppointmentsSchema.parse({
      timezone: result.timezone,
      appointments: result.appointments.map((appointment) => ({
        id: appointment.id,
        startTime: appointment.startTime.toISOString(),
        endTime: appointment.endTime.toISOString(),
        status: appointment.status,
        serviceId: appointment.serviceId,
        staffId: appointment.staffId,
        customer: appointment.customer,
        service: appointment.service,
        staff: appointment.staff,
        canCancel: appointment.canCancel,
        changeRequest: appointment.changeRequest,
      })),
    })
    return NextResponse.json(payload)
  } catch (error: unknown) {
    if (isCustomerPortalHttpError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return apiErrorResponse(error)
  }
}

function bookingErrorResponse(error: unknown): Response {
  if (isCustomerPortalHttpError(error)) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  if (error instanceof SerializableConflictError) {
    return NextResponse.json({ error: 'Conflit horaire détecté' }, { status: 409 })
  }
  return apiErrorResponse(error)
}

export async function POST(request: Request) {
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

  const session = await getCustomerPortalSession(request)
  if (!session || session.accountType !== 'CUSTOMER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = CustomerPortalBookingSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid booking request' }, { status: 400 })

  try {
    const created = await createCustomerPortalAppointment({
      organizationId: session.organizationId,
      verifiedEmail: session.verifiedEmail,
      customerId: parsed.data.customerId,
      serviceId: parsed.data.serviceId,
      staffId: parsed.data.staffId,
      start: parsed.data.start,
    })

    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? new URL(request.url).origin)
      .replace(/\/+$/, '')
    const portalUrl = `${baseUrl}/portail/${encodeURIComponent(created.organizationSlug)}/reserver`
    let emailSent = true
    try {
      await sendAppointmentConfirmation({
        to: created.email,
        appointment: {
          ...created.appointment,
          serviceName: created.serviceName,
          organizationName: created.organizationName,
          timezone: created.timezone,
          portalUrl,
        },
      })
    } catch (error: unknown) {
      emailSent = false
      logger.error('Customer portal booking confirmation email failed', {
        appointmentId: created.appointment.id,
        error,
      })
    }

    return NextResponse.json({
      appointment: {
        id: created.appointment.id,
        start: created.appointment.startTime.toISOString(),
        end: created.appointment.endTime.toISOString(),
      },
      emailSent,
    }, { status: 201 })
  } catch (error: unknown) {
    return bookingErrorResponse(error)
  }
}

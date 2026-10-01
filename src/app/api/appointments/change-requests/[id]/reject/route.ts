import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import apiErrorResponse from '@/lib/api'
import { AppointmentChangeRequestIdSchema } from '@/schemas/customerPortal'
import { CustomerPortalHttpError } from '@/services/customerPortal.service'
import { rejectAppointmentChangeRequest } from '@/services/appointmentChangeRequests.service'

interface RouteContext {
  params: Promise<{ id: string }>
}

const RejectChangeRequestSchema = z.object({
  reviewReason: z.string().trim().max(500).optional(),
}).strict()

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

  let body: unknown = {}
  if (request.body) {
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
  }
  const parsedBody = RejectChangeRequestSchema.safeParse(body)
  if (!parsedBody.success) {
    return NextResponse.json({ error: 'Invalid rejection reason' }, { status: 400 })
  }

  try {
    await rejectAppointmentChangeRequest({
      requestId: parsedId.data,
      organizationId,
      reviewerId,
      reviewReason: parsedBody.data.reviewReason,
    })
    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    if (error instanceof CustomerPortalHttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return apiErrorResponse(error)
  }
}

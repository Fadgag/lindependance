import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import apiErrorResponse from '@/lib/api'
import { CustomerPortalHttpError } from '@/services/customerPortal.service'
import { getPendingAppointmentChangeRequests } from '@/services/appointmentChangeRequests.service'

export async function GET() {
  try {
    const session = await auth()
    const organizationId = session?.user?.organizationId
    if (!organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.accountType !== 'STAFF') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(await getPendingAppointmentChangeRequests({ organizationId }))
  } catch (error: unknown) {
    if (error instanceof CustomerPortalHttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return apiErrorResponse(error)
  }
}

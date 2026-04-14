import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { createAppointmentForOrg } from '@/services/appointmentService'

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session || !session.user?.organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const form = await request.formData()
    const start = String(form.get('start') || '')
    const duration = Number(form.get('duration') || 0)
    const endDate = new Date(start)
    endDate.setMinutes(endDate.getMinutes() + duration)
    const end = endDate.toISOString()
    const payload = {
      start,
      end,
      duration,
      serviceId: String(form.get('serviceId') || ''),
      customerId: String(form.get('customerId') || ''),
      note: String(form.get('note') || '') || undefined,
    }

    try {
      await createAppointmentForOrg(payload, session.user.organizationId)
    } catch (err) {
      return NextResponse.json({ error: 'Invalid input or server error' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}



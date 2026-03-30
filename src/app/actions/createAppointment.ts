import { prisma } from '../../lib/prisma'
import { NextResponse } from 'next/server'

type CreateAppointmentInput = {
  startTime: string // ISO string
  serviceId: string
  customerId: string
  staffId: string
  organizationId: string
}

export async function POST(request: Request) {
  try {
    const body: CreateAppointmentInput = await request.json()

    // fetch service duration
    const service = await prisma.service.findUnique({ where: { id: body.serviceId } })
    if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 })

    const start = new Date(body.startTime)
    const end = new Date(start.getTime() + service.durationMinutes * 60 * 1000)

    const appointment = await prisma.appointment.create({
      data: {
        startTime: start,
        endTime: end,
        serviceId: body.serviceId,
        customerId: body.customerId,
        staffId: body.staffId,
        organizationId: body.organizationId,
      }
    })

    return NextResponse.json(appointment)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}


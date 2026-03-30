import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'

export async function GET() {
  try {
    const appointments = await prisma.appointment.findMany({
      include: { service: true, customer: true },
    })

    // Map to FullCalendar event shape
    const events = appointments.map((a) => ({
      id: a.id,
      title: `${a.customer.firstName} ${a.customer.lastName} — ${a.service.name}`,
      start: a.startTime.toISOString(),
      end: a.endTime.toISOString(),
      resourceId: a.staffId,
      extendedProps: {
        serviceId: a.serviceId,
        customerId: a.customerId,
        organizationId: a.organizationId,
      }
    }))

    return NextResponse.json(events)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { startTime, serviceId, customerId, staffId, organizationId } = body

    const service = await prisma.service.findUnique({ where: { id: serviceId } })
    if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 })

    const start = new Date(startTime)
    const end = new Date(start.getTime() + service.durationMinutes * 60 * 1000)

    const appointment = await prisma.appointment.create({
      data: {
        startTime: start,
        endTime: end,
        serviceId,
        customerId,
        staffId,
        organizationId,
      }
    })

    return NextResponse.json(appointment)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, newStart } = body
    if (!id || !newStart) return NextResponse.json({ error: 'Missing id or newStart' }, { status: 400 })

    const appointment = await prisma.appointment.findUnique({ where: { id } })
    if (!appointment) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })

    const service = await prisma.service.findUnique({ where: { id: appointment.serviceId } })
    if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 })

    const start = new Date(newStart)
    const end = new Date(start.getTime() + service.durationMinutes * 60 * 1000)

    const updated = await prisma.appointment.update({
      where: { id },
      data: { startTime: start, endTime: end }
    })

    return NextResponse.json(updated)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}


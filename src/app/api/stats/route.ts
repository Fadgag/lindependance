import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(req: Request) {
  try {
    const session = await getSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Example: compute total revenue from appointments (sum of service price for appointments in org)
    const orgId = session.organizationId
    if (!orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const revenue = await prisma.appointment.findMany({ where: { organizationId: orgId }, include: { service: true } })
    const total = revenue.reduce((acc, a) => acc + (a.service?.price ?? 0), 0)

    return NextResponse.json({ totalRevenue: total })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}


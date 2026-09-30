import { NextResponse } from 'next/server'
import { getLocalDateForInstant, getUtcRangeForLocalDay } from '@/domain/customer-portal/scheduling'
import { auth } from '@/auth'
import apiErrorResponse from '@/lib/api'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await auth()
    const organizationId = session?.user?.organizationId
    if (!organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { timezone: true },
    })
    if (!organization) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

    const now = new Date()
    const date = getLocalDateForInstant(now, organization.timezone)
    const range = getUtcRangeForLocalDay(date, organization.timezone)
    if (!range) return NextResponse.json({ error: 'Invalid organization timezone' }, { status: 500 })

    const count = await prisma.appointment.count({
      where: {
        organizationId,
        bookingSource: 'PORTAL',
        status: { not: 'CANCELLED' },
        createdAt: { gte: range.start, lt: range.end },
      },
    })
    return NextResponse.json({ count })
  } catch (error: unknown) {
    return apiErrorResponse(error)
  }
}

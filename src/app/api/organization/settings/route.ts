import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { z } from 'zod'
import apiErrorResponse from '@/lib/api'

const PatchSettingsSchema = z.object({
  dailyTarget: z.number().nonnegative()
})

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const orgId = session.user?.organizationId
    if (!orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { dailyTarget: true } })
    return NextResponse.json({ dailyTarget: org?.dailyTarget ?? 0 })
  } catch (err) {
    return apiErrorResponse(err)
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const orgId = session.user?.organizationId
    if (!orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const parsed = PatchSettingsSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 })
    const { dailyTarget } = parsed.data

    const updated = await prisma.organization.update({ where: { id: orgId }, data: { dailyTarget } })
    return NextResponse.json({ dailyTarget: updated.dailyTarget })
  } catch (err) {
    return apiErrorResponse(err)
  }
}






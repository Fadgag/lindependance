import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import apiErrorResponse from '@/lib/api'
import {auth} from "@/auth";

export async function GET(_request: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!session.user?.organizationId ) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const staff = await prisma.staff.findMany({ where: { organizationId: session.user?.organizationId  } })
    type StaffRow = { id: string; firstName?: string | null; lastName?: string | null }
    // RAISON: Prisma retourne StaffRow[] — type local aligné sur la sélection Prisma, res.json() est unknown
    const resources = (staff as StaffRow[]).map((s) => ({ id: s.id, title: `${s.firstName || ''} ${s.lastName || ''}`.trim() }))
    return NextResponse.json(resources)
  } catch (err) {
    return apiErrorResponse(err)
  }
}





import { NextResponse } from 'next/server'
import dashboardService from '../../../../services/dashboard.service'
import { auth } from '../../../../auth'

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const orgId = session.user?.organizationId
    if (!orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const url = new URL(request.url)
    const startParam = url.searchParams.get('start')
    const endParam = url.searchParams.get('end')
    const start = startParam ? new Date(startParam) : undefined
    const end = endParam ? new Date(endParam) : undefined

    const data = await dashboardService.getDashboardForOrg(orgId, { start, end })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'



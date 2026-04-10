import { NextResponse } from 'next/server'
import dashboardService from '../../../../services/dashboard.service'
import { auth } from '../../../../auth'
import apiErrorResponse from '../../../../lib/api'
import { z } from 'zod'

const paramsSchema = z.object({
  // Accepte YYYY-MM-DD et ISO 8601 complet — refine vérifie que la date est parseable
  start: z.string().refine(v => !isNaN(new Date(v).getTime()), { message: 'Invalid start date' }).optional(),
  end: z.string().refine(v => !isNaN(new Date(v).getTime()), { message: 'Invalid end date' }).optional(),
})

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const orgId = session.user?.organizationId
    if (!orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const url = new URL(request.url)
    const parsed = paramsSchema.safeParse({
      start: url.searchParams.get('start') ?? undefined,
      end: url.searchParams.get('end') ?? undefined,
    })
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid date params', details: parsed.error.format() }, { status: 400 })
    }

    const start = parsed.data.start ? new Date(parsed.data.start) : undefined
    const end = parsed.data.end ? new Date(parsed.data.end) : undefined

    const data = await dashboardService.getDashboardForOrg(orgId, { start, end })
    return NextResponse.json(data)
  } catch (err) {
    return apiErrorResponse(err)
  }
}

export const dynamic = 'force-dynamic'



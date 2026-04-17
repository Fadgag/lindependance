import { NextResponse } from 'next/server'
import { getDashboardForOrg } from '@/services/dashboard.service'
import { auth } from '@/auth'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')
  const testKey = req.headers.get('x-test-api-key')

  let orgId: string | undefined
  // Allow test-mode querying only in non-production environments and only when a valid TEST_API_KEY is provided.
  if (process.env.NODE_ENV !== 'production' && testKey && testKey === process.env.TEST_API_KEY) {
    orgId = url.searchParams.get('orgId') ?? undefined
    if (!orgId) return NextResponse.json({ error: 'orgId required in test mode' }, { status: 400 })
  } else {
    const session = await auth()
    if (!session?.user?.organizationId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    orgId = session.user.organizationId as string
  }

  const start = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 3600 * 1000)
  const end = to ? new Date(to) : new Date()
  const data = await getDashboardForOrg(orgId as string, { start, end })
  return NextResponse.json(data)
}


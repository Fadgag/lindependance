import { NextResponse } from 'next/server'
import { CustomerPortalOtpVerificationSchema } from '@/schemas/customerPortal'
import {
  createCustomerPortalSession,
  getCustomerPortalSecret,
  hashRateLimitKey,
} from '@/lib/customerPortalSecurity'
import {
  consumeCustomerOtp,
  consumePortalRateLimits,
  findEnabledPortalOrganization,
  getRequestIp,
  setCustomerPortalSessionCookie,
} from '@/services/customerPortal.service'

const IP_WINDOW_MS = 60 * 60 * 1000

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = CustomerPortalOtpVerificationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const organization = await findEnabledPortalOrganization(parsed.data.organizationSlug)
  if (!organization) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const secret = getCustomerPortalSecret()
  const now = new Date()
  const allowed = await consumePortalRateLimits([{
    scope: 'otp-ip-request',
    keyHash: hashRateLimitKey('ip', getRequestIp(request), secret),
    limit: 10,
    windowMilliseconds: IP_WINDOW_MS,
  }], now)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  const consumed = await consumeCustomerOtp({
    organizationId: organization.id,
    email: parsed.data.email,
    code: parsed.data.code,
    secret,
    now,
  })
  if (!consumed) {
    return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 })
  }

  const token = createCustomerPortalSession({
    organizationId: organization.id,
    verifiedEmail: parsed.data.email,
    secret,
    now,
  })
  const response = NextResponse.json({ ok: true })
  return setCustomerPortalSessionCookie(response, token)
}

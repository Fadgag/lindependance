import { randomInt } from 'node:crypto'
import { NextResponse } from 'next/server'
import { CustomerPortalOtpRequestSchema } from '@/schemas/customerPortal'
import { prisma } from '@/lib/prisma'
import {
  getCustomerPortalSecret,
  hashOtp,
  hashRateLimitKey,
} from '@/lib/customerPortalSecurity'
import { logger } from '@/lib/logger'
import {
  consumePortalRateLimits,
  findEnabledPortalOrganization,
  getRequestIp,
  issueCustomerOtp,
} from '@/services/customerPortal.service'
import { sendCustomerPortalOtpEmail } from '@/services/customerPortalEmail.service'

const OTP_TTL_MS = 10 * 60 * 1000
const EMAIL_WINDOW_MS = 15 * 60 * 1000
const IP_WINDOW_MS = 60 * 60 * 1000

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = CustomerPortalOtpRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const organization = await findEnabledPortalOrganization(parsed.data.organizationSlug)
  if (!organization) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const secret = getCustomerPortalSecret()
  const now = new Date()
  const email = parsed.data.email
  const allowed = await consumePortalRateLimits([
    {
      scope: 'otp-email-request',
      keyHash: hashRateLimitKey('email', email, secret),
      limit: 3,
      windowMilliseconds: EMAIL_WINDOW_MS,
    },
    {
      scope: 'otp-ip-request',
      keyHash: hashRateLimitKey('ip', getRequestIp(request), secret),
      limit: 10,
      windowMilliseconds: IP_WINDOW_MS,
    },
  ], now)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  const customer = await prisma.customer.findFirst({
    where: { organizationId: organization.id, email },
    select: { id: true },
  })

  if (customer) {
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0')
    try {
      await issueCustomerOtp({
        organizationId: organization.id,
        email,
        codeHash: hashOtp(code, secret),
        expiresAt: new Date(now.getTime() + OTP_TTL_MS),
        now,
      })
      await sendCustomerPortalOtpEmail({
        to: email,
        code,
        organizationName: organization.name,
        template: organization.portalOtpEmailTemplate ?? null,
      })
    } catch (error: unknown) {
      logger.error('Customer portal OTP delivery failed', error)
    }
  }

  return NextResponse.json({ ok: true }, { status: 202 })
}

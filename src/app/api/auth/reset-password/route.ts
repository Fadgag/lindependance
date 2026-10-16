import { NextResponse } from 'next/server'
import apiErrorResponse from '@/lib/api'
import { z } from 'zod'
import { AUTH_RATE_LIMIT_POLICIES } from '@/domain/auth/rateLimit'
import {
  consumeAuthRateLimit,
  consumeClientIpRateLimit,
  consumePasswordResetToken,
} from '@/services/auth-rate-limit.service'

function tooManyAttempts(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: 'Too many attempts. Try again later.' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
  )
}

const ResetPasswordSchema = z.object({
  token: z.string().length(64), // token = 64 hex chars (randomBytes(32).toString('hex'))
  password: z.string().min(8),
})

export async function POST(req: Request) {
  try {
    const parsed = ResetPasswordSchema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    const { token, password } = parsed.data

    const ipLimit = await consumeClientIpRateLimit(
      'reset-submit-ip',
      req,
      AUTH_RATE_LIMIT_POLICIES.resetSubmitByIp,
    )
    if (!ipLimit.allowed) return tooManyAttempts(ipLimit.retryAfterSeconds)

    const tokenLimit = await consumeAuthRateLimit(
      'reset-submit-token',
      token,
      AUTH_RATE_LIMIT_POLICIES.resetSubmitByToken,
    )
    if (!tokenLimit.allowed) return tooManyAttempts(tokenLimit.retryAfterSeconds)

    const result = await consumePasswordResetToken(token, password)
    if (result === 'expired') {
      return NextResponse.json({ error: 'Token expired' }, { status: 400 })
    }
    if (result === 'invalid') {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    return apiErrorResponse(err)
  }
}

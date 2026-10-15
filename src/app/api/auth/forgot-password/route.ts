import { after, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import crypto from 'crypto'
import { Resend } from 'resend'
import { z } from 'zod'
import {
  AUTH_RATE_LIMIT_POLICIES,
  normalizeRateLimitEmail,
} from '@/domain/auth/rateLimit'
import {
  consumeAuthRateLimit,
  consumeClientIpRateLimit,
  createOrReusePasswordResetToken,
  deletePasswordResetToken,
} from '@/services/auth-rate-limit.service'

function acceptedResponse() {
  return NextResponse.json({ ok: true })
}

async function processPasswordResetRequest(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user?.email) return

  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    logger.error('Resend API key not configured')
    return
  }

  const token = crypto.randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 1000 * 60 * 60)
  const resetToken = await createOrReusePasswordResetToken(user.email, token, expires)
  if (!resetToken.created) return

  const base = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const resetUrl = `${base}/auth/new-password?token=${resetToken.token}`
  const resend = new Resend(resendApiKey)

  const html = `<div style="font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; background:#f7f4ef; padding:40px; text-align:center">
      <img src="${base}/favicon.ico" alt="Logo" style="width:64px;height:64px;margin-bottom:16px;" />
      <h2 style="color:#1f2937">Réinitialiser votre mot de passe</h2>
      <p style="color:#374151">Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe. Ce lien expire dans 1 heure.</p>
      <a href="${resetUrl}" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#111827;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">Réinitialiser mon mot de passe</a>
    </div>`

  try {
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM || 'no-reply@studio.test',
      to: user.email,
      subject: 'Réinitialisation de votre mot de passe',
      html,
    })
    if (result.error) throw result.error
  } catch (err) {
    logger.error('Password reset email could not be sent', err)
    await deletePasswordResetToken(user.email, resetToken.token)
  }
}

export async function POST(req: Request) {
  try {
    const parsedBody = z.object({ email: z.string().email() }).safeParse(await req.json())
    if (!parsedBody.success) return NextResponse.json({ error: 'Email required' }, { status: 400 })
    const email = parsedBody.data.email.trim()

    const ipLimit = await consumeClientIpRateLimit(
      'reset-request-ip',
      req,
      AUTH_RATE_LIMIT_POLICIES.resetRequestByIp,
    )
    if (!ipLimit.allowed) return acceptedResponse()

    const emailLimit = await consumeAuthRateLimit(
      'reset-request-email',
      normalizeRateLimitEmail(email),
      AUTH_RATE_LIMIT_POLICIES.resetRequestByEmail,
    )
    if (!emailLimit.allowed) return acceptedResponse()

    after(async () => {
      try {
        await processPasswordResetRequest(email)
      } catch (err) {
        logger.error('Password reset request processing failed', err)
      }
    })

    return acceptedResponse()
  } catch (err) {
    logger.error('Password reset request failed', err)
    return acceptedResponse()
  }
}

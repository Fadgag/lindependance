import { randomBytes } from 'node:crypto'
import { Resend } from 'resend'
import {
  createOrReusePasswordResetToken,
  deletePasswordResetToken,
} from '@/services/auth-rate-limit.service'
import { logger } from '@/lib/logger'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const DELIVERY_ERROR = 'Le salon et le compte sont créés, mais l’envoi de l’e-mail d’activation a échoué ou n’a pas pu être confirmé.'
const TOKEN_CLEANUP_ERROR = 'The failed test staff activation token could not be removed'

async function removeActivationToken(email: string, token: string): Promise<void> {
  try {
    await deletePasswordResetToken(email, token)
  } catch {
    logger.error(TOKEN_CLEANUP_ERROR)
  }
}

export async function sendTestStaffActivationEmail(input: {
  email: string
  salonName: string
}): Promise<{ sent: boolean; error: string | null }> {
  const apiKey = process.env.RESEND_API_KEY
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL
  if (!apiKey || !appUrl) {
    return { sent: false, error: DELIVERY_ERROR }
  }

  let activationUrl: URL
  try {
    activationUrl = new URL('/auth/new-password', appUrl)
  } catch {
    return { sent: false, error: DELIVERY_ERROR }
  }
  if (activationUrl.protocol !== 'https:') {
    return { sent: false, error: DELIVERY_ERROR }
  }

  const token = randomBytes(32).toString('hex')
  let resetToken: Awaited<ReturnType<typeof createOrReusePasswordResetToken>>
  try {
    resetToken = await createOrReusePasswordResetToken(
      input.email,
      token,
      new Date(Date.now() + 60 * 60 * 1000),
    )
  } catch {
    logger.error('Test staff activation token could not be created')
    return { sent: false, error: DELIVERY_ERROR }
  }
  activationUrl.searchParams.set('token', resetToken.token)

  try {
    const result = await new Resend(apiKey).emails.send({
      from: process.env.RESEND_FROM || 'no-reply@studio.test',
      to: input.email,
      subject: 'Activation de votre compte staff de test',
      html: [
        '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:32px;color:#2D2424">',
        '<h1 style="font-size:22px">Activez votre compte staff</h1>',
        `<p>Un compte staff a été créé pour <strong>${escapeHtml(input.salonName)}</strong>.</p>`,
        '<p>Définissez votre mot de passe à l’aide du lien ci-dessous. Il est valable une heure et ne peut être utilisé qu’une fois.</p>',
        `<p><a href="${escapeHtml(activationUrl.toString())}">Définir mon mot de passe</a></p>`,
        '<p>Si vous n’attendiez pas ce message, vous pouvez l’ignorer.</p>',
        '</div>',
      ].join(''),
    })
    if (result.error) {
      logger.error('Test staff activation email could not be sent')
      await removeActivationToken(input.email, resetToken.token)
      return { sent: false, error: DELIVERY_ERROR }
    }
  } catch {
    logger.error('Test staff activation email could not be sent')
    await removeActivationToken(input.email, resetToken.token)
    return { sent: false, error: DELIVERY_ERROR }
  }

  return { sent: true, error: null }
}

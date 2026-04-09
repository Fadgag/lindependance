import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import apiErrorResponse from '@/lib/api'
import type { PrismaClient } from '@prisma/client'
const db = prisma as PrismaClient
import crypto from 'crypto'
import { Resend } from 'resend'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    // check user exists
    const user = await db.user.findUnique({ where: { email } })
    if (!user) {
      // do not reveal existence
      return NextResponse.json({ ok: true })
    }

    // generate token
    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 1000 * 60 * 60) // 1 hour

    // upsert token
    await db.passwordResetToken.upsert({
      where: { email },
      update: { token, expires },
      create: { email, token, expires }
    })

    // build reset url
    const base = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const resetUrl = `${base}/auth/new-password?token=${token}`

    // send email via Resend
    // Instantiate Resend client lazily to avoid throwing at module load if API key is absent
    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      console.error('Resend API key not configured')
      return NextResponse.json({ error: 'Email provider not configured' }, { status: 500 })
    }
    const resend = new Resend(resendApiKey)

    const html = `<div style="font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; background:#f7f4ef; padding:40px; text-align:center">
      <img src="${base}/favicon.ico" alt="Logo" style="width:64px;height:64px;margin-bottom:16px;" />
      <h2 style="color:#1f2937">Réinitialiser votre mot de passe</h2>
      <p style="color:#374151">Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe. Ce lien expire dans 1 heure.</p>
      <a href="${resetUrl}" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#111827;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">Réinitialiser mon mot de passe</a>
    </div>`

    await resend.emails.send({
      from: process.env.RESEND_FROM || 'no-reply@studio.test',
      to: email,
      subject: 'Réinitialisation de votre mot de passe',
      html
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return apiErrorResponse(err)
  }
}


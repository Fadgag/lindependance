import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import apiErrorResponse from '@/lib/api'
import { z } from 'zod'

const BCRYPT_ROUNDS = 12 // cohérence avec password.service.ts

const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
})

export async function POST(req: Request) {
  try {
    const parsed = ResetPasswordSchema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    const { token, password } = parsed.data

    const pr = await prisma.passwordResetToken.findUnique({ where: { token } })
    if (!pr) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })
    if (pr.expires < new Date()) {
      await prisma.passwordResetToken.delete({ where: { token } }).catch(() => {})
      return NextResponse.json({ error: 'Token expired' }, { status: 400 })
    }

    const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS)
    await prisma.user.update({ where: { email: pr.email }, data: { hashedPassword: hashed } })
    await prisma.passwordResetToken.delete({ where: { token } })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return apiErrorResponse(err)
  }
}


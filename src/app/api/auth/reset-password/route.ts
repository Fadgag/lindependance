import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import apiErrorResponse from '@/lib/api'
import type { PrismaClient } from '@prisma/client'
const db = prisma as PrismaClient

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json()
    if (!token || !password) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

    const pr = await db.passwordResetToken.findUnique({ where: { token } })
    if (!pr) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })
    if (pr.expires < new Date()) {
      await db.passwordResetToken.delete({ where: { token } }).catch(() => {})
      return NextResponse.json({ error: 'Token expired' }, { status: 400 })
    }

    const hashed = await bcrypt.hash(password, 10)
    await db.user.update({ where: { email: pr.email }, data: { hashedPassword: hashed } })
    await db.passwordResetToken.delete({ where: { token } })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return apiErrorResponse(err)
  }
}


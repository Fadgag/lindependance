import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import apiErrorResponse from '@/lib/api'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { auth } from "@/auth"
import { BCRYPT_ROUNDS } from '@/lib/crypto'

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).optional(),
  password: z.string().min(8),
  role: z.string().optional(),
})

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (!session.user?.organizationId ) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const users = await prisma.user.findMany({ where: { organizationId: session.user?.organizationId  }, select: { id: true, name: true, email: true, role: true } })
    return NextResponse.json(users)
  } catch (err) {
    return apiErrorResponse(err)
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (!session.user?.organizationId ) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const parsed = CreateUserSchema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 })
    const { email, name, password, role } = parsed.data

    const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS)
    const user = await prisma.user.create({ data: { email, name, hashedPassword: hashed, organizationId: session.user?.organizationId , role: role ?? 'USER' } })
    return NextResponse.json({ id: user.id, email: user.email, name: user.name, role: user.role })
  } catch (err) {
    return apiErrorResponse(err)
  }
}


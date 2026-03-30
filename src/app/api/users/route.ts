import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function GET(req: Request) {
  try {
    const session = await getSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (!session.organizationId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const users = await prisma.user.findMany({ where: { organizationId: session.organizationId }, select: { id: true, name: true, email: true, role: true } })
    return NextResponse.json(users)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (!session.organizationId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { email, name, password, role } = body
    if (!email || !password) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

    const hashed = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({ data: { email, name, hashedPassword: hashed, organizationId: session.organizationId, role: role ?? 'USER' } })
    return NextResponse.json({ id: user.id, email: user.email, name: user.name, role: user.role })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}


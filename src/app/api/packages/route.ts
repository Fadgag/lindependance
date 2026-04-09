import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
// Prisma typings can sometimes be lost across module boundaries in this repo's TS config.
// Use a local typed alias to preserve PrismaClient where needed (TS18046 workaround).
import type { PrismaClient } from '@prisma/client'
const db = prisma as PrismaClient
import apiErrorResponse from '@/lib/api'
import { CreatePackageSchema } from '@/schemas/packages'
import {auth} from "@/auth";

// centralized package schema used

export async function GET(_request: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!session.user?.organizationId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const packs = await db.package.findMany({
      where: { organizationId: session.user?.organizationId },
      include: { packageServices: { include: { service: true } } }
    })
    return NextResponse.json(packs)
  } catch (err) {
    return apiErrorResponse(err)
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!session.user?.organizationId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const parsed = CreatePackageSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 })
    const { name, price, description } = parsed.data
    const pkg = await db.package.create({ data: { name, price: price ?? 0, description: description ?? undefined, organizationId: session.user?.organizationId } })
    return NextResponse.json(pkg)
  } catch (err) {
    return apiErrorResponse(err)
  }
}


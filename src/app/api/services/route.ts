import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { ServiceCreateSchema, ServiceUpdateSchema } from '@/schemas/services'
import {auth} from "@/auth";

export async function GET(_request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!session.user?.organizationId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const services = await prisma.service.findMany({ where: { organizationId: session.user?.organizationId } })
  return NextResponse.json(services)
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!session.user?.organizationId ) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  // validation handled by centralized schema

  const parsed = ServiceCreateSchema.safeParse(await request.json())
  if (!parsed.success) {
    logger.warn('services.POST validation failed', parsed.error.format())
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 })
  }

  const service = await prisma.service.create({
    data: {
      name: parsed.data.name,
      durationMinutes: parsed.data.durationMinutes,
      price: parsed.data.price || 0,
      color: parsed.data.color,
      organizationId: session.user?.organizationId ,
    }
  })
  return NextResponse.json(service)
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!session.user?.organizationId ) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: "ID manquant" }, { status: 400 })

  // validation handled by centralized schema

  const parsed = ServiceUpdateSchema.safeParse(await request.json())
  if (!parsed.success) {
    logger.warn('services.PUT validation failed', parsed.error.format())
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 })
  }

  // ensure the service belongs to the organization
  const existing = await prisma.service.findFirst({ where: { id, organizationId: session.user?.organizationId  } })
  if (!existing) return NextResponse.json({ error: 'Service not found' }, { status: 404 })

  const updated = await prisma.service.update({
    where: { id },
    data: {
      name: parsed.data.name,
      durationMinutes: parsed.data.durationMinutes,
      price: parsed.data.price,
      color: parsed.data.color
    }
  })
  return NextResponse.json(updated)
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!session.user?.organizationId ) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: "ID manquant" }, { status: 400 })

  // scoped delete to avoid cross-org deletion
  await prisma.service.deleteMany({ where: { id, organizationId: session.user?.organizationId  } })
  return NextResponse.json({ success: true })
}
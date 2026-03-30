import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const packs = await prisma.package.findMany({
      include: { packageServices: { include: { service: true } } }
    })
    return NextResponse.json(packs)
  } catch (err) {
    console.error('GET /api/packages error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}


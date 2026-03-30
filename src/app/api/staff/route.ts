import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'

export async function GET() {
  try {
    const staff = await prisma.staff.findMany()
    const resources = staff.map((s) => ({ id: s.id, title: `${s.firstName} ${s.lastName}` }))
    return NextResponse.json(resources)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}


import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'

export async function GET() {
  try {
    const customers = await prisma.customer.findMany({ orderBy: { lastName: 'asc' } })
    return NextResponse.json(customers)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}


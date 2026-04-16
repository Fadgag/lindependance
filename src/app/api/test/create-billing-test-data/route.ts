import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  // Safety: Never expose test data creation in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'not available' }, { status: 404 })
  }
  const testKey = req.headers.get('x-test-api-key')
  if (!process.env.TEST_API_KEY || testKey !== process.env.TEST_API_KEY) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const servicePrice = Number(body.servicePrice ?? 40)
  const productPrice = Number(body.productPrice ?? 15)
  const productQty = Number(body.productQty ?? 2)

  // create a dedicated test organization
  const org = await prisma.organization.create({ data: { name: `playwright-test-${Date.now()}` } })

  const service = await prisma.service.create({ data: { name: 'Test Service', durationMinutes: 60, price: String(servicePrice), organizationId: org.id } })
  const product = await prisma.product.create({ data: { name: 'Test Product', priceTTC: productPrice, taxRate: 0, stock: 100, organizationId: org.id } })
  const customer = await prisma.customer.create({ data: { firstName: 'Test', lastName: 'User', phone: null, organizationId: org.id } })

  const soldProducts = [ { productId: product.id, name: product.name, priceTTC: product.priceTTC, quantity: productQty, totalTTC: product.priceTTC * productQty } ]

  const appt = await prisma.appointment.create({
    data: {
      startTime: new Date(),
      endTime: new Date(Date.now() + 60 * 60 * 1000),
      duration: 60,
      status: 'PAID',
      finalPrice: servicePrice + (productPrice * productQty),
      price: String(servicePrice),
      soldProducts: JSON.stringify(soldProducts),
      serviceId: service.id,
      customerId: customer.id,
      organizationId: org.id
    }
  })

  // Update productsTotal via raw SQL to avoid relying on regenerated Prisma client types
  await prisma.$executeRawUnsafe('UPDATE "Appointment" SET "productsTotal" = $1 WHERE id = $2', productPrice * productQty, appt.id)

  return NextResponse.json({ orgId: org.id, appointmentId: appt.id })
}




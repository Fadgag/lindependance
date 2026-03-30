const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  await prisma.appointment.deleteMany()
  await prisma.service.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.staff.deleteMany()
  await prisma.organization.deleteMany()

  const org = await prisma.organization.create({ data: { name: 'Salon Test' } })

  const staff1 = await prisma.staff.create({ data: { firstName: 'Alice', lastName: 'Dupont', organizationId: org.id } })
  const staff2 = await prisma.staff.create({ data: { firstName: 'Bob', lastName: 'Martin', organizationId: org.id } })

  const customer = await prisma.customer.create({ data: { firstName: 'John', lastName: 'Doe', phone: '+33123456789', organizationId: org.id } })

  const service = await prisma.service.create({ data: { name: 'Coupe', durationMinutes: 45, price: 30.0, organizationId: org.id } })

  const start = new Date()
  start.setHours(start.getHours() + 1)
  const end = new Date(start.getTime() + service.durationMinutes * 60 * 1000)

  await prisma.appointment.create({ data: { startTime: start, endTime: end, serviceId: service.id, customerId: customer.id, staffId: staff1.id, organizationId: org.id } })

  console.log('Seed done')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())


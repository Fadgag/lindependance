import { PrismaClient } from '@prisma/client'

const p = new PrismaClient()

async function listForOrg(orgId, startIso, endIso, onlyPaid = false) {
  const start = new Date(startIso)
  const end = new Date(endIso)
  const where = {
    organizationId: orgId,
    startTime: { gte: start, lte: end },
    status: { not: 'CANCELLED' }
  }
  if (onlyPaid) {
    where.AND = [{ OR: [{ status: 'PAID' }, { status: 'PAYED' }, { finalPrice: { gt: 0 } }] }]
  }

  const rows = await p.appointment.findMany({
    where,
    orderBy: { startTime: 'desc' },
    take: 500,
    select: {
      id: true,
      startTime: true,
      status: true,
      finalPrice: true,
      price: true,
      soldProducts: true,
      organizationId: true,
      customerId: true,
      serviceId: true
    }
  })

  console.log(`Found ${rows.length} appointments for org=${orgId} (onlyPaid=${onlyPaid})`)
  for (const r of rows) {
    console.log({
      id: r.id,
      startTime: r.startTime?.toISOString(),
      status: r.status,
      finalPrice: r.finalPrice,
      price: r.price != null ? String(r.price) : null,
      soldProducts: r.soldProducts,
      organizationId: r.organizationId,
      customerId: r.customerId,
      serviceId: r.serviceId
    })
  }
}

async function main() {
  // EDIT THESE VALUES BEFORE RUNNING
  const startIso = '2026-03-31T22:00:00.000Z'
  const endIso = '2026-04-30T21:59:59.999Z'
  const orgs = ['org_main', 'org_studio_001']

  for (const org of orgs) {
    console.log('\n--- ORG:', org, 'ALL ---')
    await listForOrg(org, startIso, endIso, false)
    console.log('\n--- ORG:', org, 'ONLY PAID ---')
    await listForOrg(org, startIso, endIso, true)
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => p.$disconnect())


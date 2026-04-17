import { PrismaClient } from '@prisma/client'

const p = new PrismaClient()

async function main(){
  const rows = await p.appointment.findMany({
    take: 100,
    orderBy: { startTime: 'desc' },
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
  for(const r of rows){
    console.log({ id: r.id, startTime: r.startTime?.toISOString(), status: r.status, finalPrice: r.finalPrice, price: r.price?.toString(), soldProducts: r.soldProducts, organizationId: r.organizationId, customerId: r.customerId, serviceId: r.serviceId })
  }
}

main().catch(e=>{ console.error(e); process.exit(1) }).finally(()=>p.$disconnect())



import { PrismaClient } from '@prisma/client'

async function main() {
  const prisma = new PrismaClient()
  try {
    console.log('Starting backfill of appointment.price from Service.price...')
    // Find all appointments with price null/0 — adjust criteria if needed
    const appts = await prisma.appointment.findMany({ include: { service: true } })
    let updated = 0
    for (const a of appts) {
      const currentPrice = (a as any).price ?? 0
      const svcPrice = (a as any).service?.price ?? null
      // If price is falsy (0 or null) and service has a price, copy it
      if ((currentPrice === 0 || currentPrice === null) && svcPrice != null) {
        // svcPrice may be Decimal | number | string; pass through as-is
        await prisma.appointment.update({ where: { id: a.id }, data: { price: svcPrice as any } })
        updated++
      }
    }
    console.log(`Backfill complete. Updated ${updated} appointments.`)
  } catch (err) {
    console.error('Backfill failed', err)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) main()


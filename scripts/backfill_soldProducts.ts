import { prisma } from '@/lib/prisma'

async function main() {
  console.log('Starting soldProducts -> soldProductsJson backfill')
  const rows = await prisma.appointment.findMany({ where: { soldProducts: { not: null } }, select: { id: true, soldProducts: true } })
  console.log(`Found ${rows.length} appointments with legacy soldProducts`)
  let updated = 0
  for (const r of rows) {
    try {
      const parsed = typeof r.soldProducts === 'string' ? JSON.parse(r.soldProducts) : r.soldProducts
      if (!parsed) continue
      let productsTotal = 0
      if (Array.isArray(parsed)) {
        for (const it of parsed) {
          const qty = typeof it.quantity === 'number' ? it.quantity : (it.quantity ? Number(it.quantity) : 1)
          const unit = typeof it.priceTTC === 'number' ? it.priceTTC : (it.priceTTC ? Number(it.priceTTC) : 0)
          productsTotal += unit * (qty || 1)
        }
      }
      // Use raw SQL update to avoid Prisma client type mismatch until client is regenerated
      await prisma.$executeRawUnsafe('UPDATE "Appointment" SET "soldProductsJson" = $1::jsonb, "productsTotal" = $2 WHERE id = $3', JSON.stringify(parsed), productsTotal, r.id)
      updated++
    } catch (e) {
      console.error('failed parse for', r.id)
    }
  }
  console.log(`Backfill complete, updated ${updated} rows`)
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1) })



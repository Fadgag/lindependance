import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const orgId = 'org_main'

  console.log('--- Début du Seed ---')

  // 1. Organisation
  await prisma.organization.upsert({
    where:  { id: orgId },
    update: {},
    create: { id: orgId, name: "L'Indépendance" },
  })
  console.log('✅ Organisation créée')

  // 2. Admin
  const hashedPassword = await bcrypt.hash('Arthur2017*', 12)
  await prisma.user.upsert({
    where:  { email: 'fanny@lindependance.fr' },
    update: { hashedPassword, role: 'ADMIN', organizationId: orgId },
    create: {
      email:          'fanny@lindependance.fr',
      name:           'Fanny',
      hashedPassword,
      role:           'ADMIN',
      organizationId: orgId,
    },
  })
  console.log('✅ Utilisateur admin créé : fanny@lindependance.fr')

  console.log('--- Seed terminé ---')
}

main()
  .catch((err) => { console.error('❌ Erreur :', err); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())

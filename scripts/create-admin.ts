/**
 * Script de création d'un utilisateur admin.
 * Usage : DATABASE_URL="..." DIRECT_URL="..." npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/create-admin.ts
 * Ou avec les variables d'env dans .env.local : pnpm exec ts-node --compiler-options '{"module":"CommonJS"}' scripts/create-admin.ts
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// ✏️ Modifie ces valeurs avant d'exécuter le script
const CONFIG = {
  orgName:  'Mon Studio',
  email:    'admin@monstudio.com',
  name:     'Admin',
  password: 'ChangeMe123!',  // ← à changer après la 1ère connexion
  role:     'ADMIN',
}

async function main() {
  console.log('🔧 Création de l\'organisation et de l\'admin...')

  // 1. Créer ou récupérer l'organisation
  const org = await prisma.organization.upsert({
    where:  { id: 'org_main' },
    update: {},
    create: { id: 'org_main', name: CONFIG.orgName },
  })
  console.log(`✅ Organisation : ${org.name} (${org.id})`)

  // 2. Créer ou mettre à jour l'utilisateur admin
  const hashedPassword = await bcrypt.hash(CONFIG.password, 12)
  const user = await prisma.user.upsert({
    where:  { email: CONFIG.email },
    update: { hashedPassword, name: CONFIG.name, role: CONFIG.role, organizationId: org.id },
    create: {
      email:          CONFIG.email,
      name:           CONFIG.name,
      hashedPassword,
      role:           CONFIG.role,
      organizationId: org.id,
    },
  })

  console.log(`✅ Utilisateur créé : ${user.email} (role: ${user.role})`)
  console.log(`\n🔑 Identifiants de connexion :`)
  console.log(`   Email    : ${CONFIG.email}`)
  console.log(`   Mot de passe : ${CONFIG.password}`)
  console.log(`\n⚠️  Pensez à changer le mot de passe après la 1ère connexion via /settings/account`)
}

main()
  .catch((err) => { console.error('❌ Erreur :', err); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())


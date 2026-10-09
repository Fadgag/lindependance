import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const prisma = new PrismaClient()
const SeedAdminSchema = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().min(1),
  password: z.string().min(16),
})

function getSeedAdminConfig() {
  const values = {
    email: process.env.SEED_ADMIN_EMAIL,
    name: process.env.SEED_ADMIN_NAME,
    password: process.env.SEED_ADMIN_PASSWORD,
  }
  if (!Object.values(values).some((value) => value?.trim())) return null

  const parsed = SeedAdminSchema.safeParse(values)
  if (!parsed.success) {
    throw new Error('Configure SEED_ADMIN_EMAIL, SEED_ADMIN_NAME and a SEED_ADMIN_PASSWORD of at least 16 characters')
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Admin seeding is disabled in production; use the verified admin bootstrap procedure')
  }

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error('DATABASE_URL is required when seeding a local admin')
  let databaseHost: string
  try {
    databaseHost = new URL(databaseUrl).hostname.toLowerCase()
  } catch {
    throw new Error('DATABASE_URL must be a valid URL when seeding a local admin')
  }
  if (!['localhost', '127.0.0.1', '[::1]'].includes(databaseHost)) {
    throw new Error('Admin seeding is allowed only against a local database; use the verified bootstrap procedure for remote databases')
  }

  return parsed.data
}

async function main() {
  const orgId = 'org_main'
  const seedAdmin = getSeedAdminConfig()

  console.log('--- Début du Seed ---')

  // 1. Organisation
  await prisma.organization.upsert({
    where:  { id: orgId },
    update: {},
    create: { id: orgId, name: "L'Indépendance" },
  })
  console.log('✅ Organisation créée')

  if (seedAdmin) {
    const existingUser = await prisma.user.findUnique({
      where: { email: seedAdmin.email },
      select: { id: true },
    })
    if (existingUser) {
      console.log('Admin seed ignoré : un compte utilise déjà cette adresse.')
    } else {
      const hashedPassword = await bcrypt.hash(seedAdmin.password, 12)
      await prisma.user.create({
        data: {
          email: seedAdmin.email,
          name: seedAdmin.name,
          hashedPassword,
          role: 'ADMIN',
          organizationId: orgId,
        },
      })
      console.log('✅ Compte admin local créé')
    }
  } else {
    console.log('Admin seed ignoré : configurez SEED_ADMIN_EMAIL, SEED_ADMIN_NAME et SEED_ADMIN_PASSWORD pour un compte local.')
  }

  console.log('--- Seed terminé ---')
}

main()
  .catch((err) => { console.error('❌ Erreur :', err); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())

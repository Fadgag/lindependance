/** Bootstrap a one-time admin account on a specifically verified Neon preprod branch. */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Required environment variable ${name} is missing`)
  return value
}

function parseDatabaseUrl(name: string): URL {
  const value = requiredEnv(name)
  const url = new URL(value)
  if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
    throw new Error(`${name} must be a PostgreSQL connection URL`)
  }
  return url
}

function normalizeNeonHost(host: string): string {
  return host.toLowerCase().replace(/-pooler(?=\.)/, '')
}

function verifyPreprodDatabaseTarget(): void {
  const databaseUrl = parseDatabaseUrl('DATABASE_URL')
  const directUrl = parseDatabaseUrl('DIRECT_URL')
  const expectedHost = normalizeNeonHost(requiredEnv('PREPROD_NEON_HOST'))

  if (!expectedHost.endsWith('.neon.tech')) {
    throw new Error('PREPROD_NEON_HOST must be the Neon hostname shown for the preprod branch')
  }
  if (
    normalizeNeonHost(databaseUrl.hostname) !== expectedHost
    || normalizeNeonHost(directUrl.hostname) !== expectedHost
    || databaseUrl.pathname !== directUrl.pathname
  ) {
    throw new Error('Database URLs do not match the confirmed Neon preprod host and database')
  }
}

async function main() {
  verifyPreprodDatabaseTarget()

  const email = requiredEnv('PREPROD_ADMIN_EMAIL').toLowerCase()
  const name = requiredEnv('PREPROD_ADMIN_NAME')
  const password = requiredEnv('PREPROD_ADMIN_PASSWORD')
  const orgId = process.env.PREPROD_ORG_ID?.trim() || 'org_main'
  const orgName = process.env.PREPROD_ORG_NAME?.trim() || "L'Indépendance (préprod)"
  if (password.length < 16) {
    throw new Error('PREPROD_ADMIN_PASSWORD must be at least 16 characters long')
  }

  const prisma = new PrismaClient()
  try {
    console.log(`Creating a preprod admin for Neon host ${normalizeNeonHost(requiredEnv('PREPROD_NEON_HOST'))}`)

  const org = await prisma.organization.upsert({
    where: { id: orgId },
    update: {},
    create: { id: orgId, name: orgName },
  })

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      throw new Error('That email already has an account; choose a unique preprod admin email')
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: {
        email,
        name,
        hashedPassword,
        role: 'ADMIN',
        organizationId: org.id,
      },
      select: { id: true, email: true, role: true },
    })

    console.log(`Created organization ${org.name} (${org.id}) and admin ${user.email} (${user.role}).`)
    console.log('Sign in to the preprod Preview and change the temporary password after login.')
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error: unknown) => {
  console.error('Preprod admin bootstrap failed:', error instanceof Error ? error.message : 'Unknown error')
  process.exitCode = 1
})

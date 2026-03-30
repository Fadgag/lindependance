import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const adminEmail = 'admin@studio.com'
  const adminName = 'Admin Studio'
  const plainPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin123!'

  // Hash password
  const hashedPassword = await bcrypt.hash(plainPassword, 10)

  // Ensure there is an organization to attach the user to
  let org = await prisma.organization.findFirst()
  if (!org) {
    org = await prisma.organization.create({ data: { name: 'Salon Test' } })
    console.log('Organization created:', org.id)
  } else {
    console.log('Organization exists:', org.id)
  }

  // Upsert admin user by unique email
  const user = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName,
      hashedPassword,
      organizationId: org.id
    },
    create: {
      email: adminEmail,
      name: adminName,
      hashedPassword,
      organizationId: org.id
    }
  })

  console.log(`Admin user ensured: ${user.email}`)
  console.log(`Password (seed): ${plainPassword}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())


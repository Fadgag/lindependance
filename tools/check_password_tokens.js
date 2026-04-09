
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
try {
  const rows = await prisma.passwordResetToken.findMany()
  console.log(rows)
} catch (e) {
  console.error(e)
} finally {
  await prisma.$disconnect()
}


import { hashPasswordResetToken, isHashedPasswordResetToken } from '../src/domain/auth/passwordResetToken'
import { prisma } from '../src/lib/prisma'

async function migratePasswordResetTokens(): Promise<void> {
  const tokens = await prisma.passwordResetToken.findMany({
    select: { id: true, token: true },
  })
  let migrated = 0

  for (const token of tokens) {
    if (isHashedPasswordResetToken(token.token)) continue

    const result = await prisma.passwordResetToken.updateMany({
      where: { id: token.id, token: token.token },
      data: { token: hashPasswordResetToken(token.token) },
    })
    migrated += result.count
  }

  process.stdout.write(`Hashed ${migrated} legacy password reset token(s).\n`)
}

async function run(): Promise<void> {
  try {
    await migratePasswordResetTokens()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Password reset token migration failed'
    process.stderr.write(`${message}\n`)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

void run()

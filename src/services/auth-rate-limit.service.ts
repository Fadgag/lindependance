import { Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { createHmac, randomUUID } from 'node:crypto'
import { z } from 'zod'
import { hashPasswordResetToken } from '@/domain/auth/passwordResetToken'
import { prisma } from '@/lib/prisma'
import { BCRYPT_ROUNDS } from '@/lib/crypto'
import { getTrustedClientIp } from '@/lib/trustedClientIp'
import {
  AUTH_RATE_LIMIT_POLICIES,
  isWithinRateLimit,
  normalizeRateLimitEmail,
  type RateLimitPolicy,
} from '@/domain/auth/rateLimit'

type RateLimitRow = {
  count: number
  resetAt: Date
}

type PasswordResetTokenRow = {
  token: string
}

type StaffCredentialUser = {
  id: string
  email: string | null
  organizationId: string | null
  role: string
  accountType: 'STAFF'
}

export type RateLimitResult = {
  allowed: boolean
  retryAfterSeconds: number
}

export type PasswordResetTokenResult = 'updated' | 'expired' | 'invalid'

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const DUMMY_PASSWORD_HASH = '$2a$12$/EsHqrEl0mK4A1HoWrd81.SBvO/H7uBG7U6ENAk9lsAqMEAKcOfk6'

export function getClientIp(request: Request): string | null {
  return getTrustedClientIp(request)
}

export async function consumeAuthRateLimit(
  scope: string,
  identifier: string,
  policy: RateLimitPolicy,
  now = new Date(),
): Promise<RateLimitResult> {
  const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET
  if (!secret) throw new Error('NEXTAUTH_SECRET or AUTH_SECRET is required for authentication rate limits')

  const key = createHmac('sha256', secret).update(`auth-rate-limit:${scope}:${identifier}`).digest('hex')
  const resetAt = new Date(now.getTime() + policy.windowMs)
  const rows = await prisma.$queryRaw<RateLimitRow[]>(Prisma.sql`
    INSERT INTO "AuthRateLimit" ("key", "count", "resetAt")
    VALUES (${key}, 1, ${resetAt})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "AuthRateLimit"."resetAt" <= ${now} THEN 1
        ELSE "AuthRateLimit"."count" + 1
      END,
      "resetAt" = CASE
        WHEN "AuthRateLimit"."resetAt" <= ${now} THEN ${resetAt}
        ELSE "AuthRateLimit"."resetAt"
      END
    RETURNING "count", "resetAt"
  `)

  const row = rows[0]
  if (!row) throw new Error('Rate limit counter was not returned by the database')

  await prisma.authRateLimit.deleteMany({
    where: { resetAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
  })

  return {
    allowed: isWithinRateLimit(row.count, policy),
    retryAfterSeconds: Math.max(1, Math.ceil((row.resetAt.getTime() - now.getTime()) / 1000)),
  }
}

export async function consumeClientIpRateLimit(
  scope: string,
  request: Request,
  policy: RateLimitPolicy,
): Promise<RateLimitResult> {
  const ip = getClientIp(request)
  if (!ip) {
    // Avoid putting every request without a trusted proxy IP into one shared bucket.
    return { allowed: true, retryAfterSeconds: Math.ceil(policy.windowMs / 1000) }
  }
  return consumeAuthRateLimit(scope, ip, policy)
}

export async function authorizeCredentials(
  credentials: Partial<Record<string, unknown>>,
  request: Request,
): Promise<StaffCredentialUser | null> {
  const ipLimit = await consumeClientIpRateLimit(
    'login-ip',
    request,
    AUTH_RATE_LIMIT_POLICIES.loginByIp,
  )
  if (!ipLimit.allowed) return null

  const parsed = credentialsSchema.safeParse(credentials)
  if (!parsed.success) return null
  const { email, password } = parsed.data

  const emailLimit = await consumeAuthRateLimit(
    'login-email',
    normalizeRateLimitEmail(email),
    AUTH_RATE_LIMIT_POLICIES.loginByEmail,
  )
  if (!emailLimit.allowed) return null

  const user = await prisma.user.findUnique({ where: { email } })
  // Keep the password-hash comparison cost similar when the email is unknown.
  const isValid = await bcrypt.compare(password, user?.hashedPassword ?? DUMMY_PASSWORD_HASH)
  if (!user?.hashedPassword || !isValid) return null

  return {
    id: user.id,
    email: user.email,
    organizationId: user.organizationId,
    role: user.role,
    accountType: 'STAFF',
  }
}

export async function createOrReusePasswordResetToken(
  email: string,
  token: string,
  expires: Date,
  now = new Date(),
): Promise<{ token: string; created: boolean }> {
  const tokenHash = hashPasswordResetToken(token)
  const rows = await prisma.$queryRaw<PasswordResetTokenRow[]>(Prisma.sql`
    INSERT INTO "PasswordResetToken" ("id", "email", "token", "expires")
    VALUES (${randomUUID()}, ${email}, ${tokenHash}, ${expires})
    ON CONFLICT ("email") DO UPDATE SET
      "token" = CASE
        WHEN "PasswordResetToken"."expires" <= ${now} THEN EXCLUDED."token"
        ELSE "PasswordResetToken"."token"
      END,
      "expires" = CASE
        WHEN "PasswordResetToken"."expires" <= ${now} THEN EXCLUDED."expires"
        ELSE "PasswordResetToken"."expires"
      END
    RETURNING "token"
  `)

  const row = rows[0]
  if (!row) throw new Error('Password reset token was not returned by the database')
  return { token, created: row.token === tokenHash }
}

export async function deletePasswordResetToken(email: string, token: string): Promise<void> {
  await prisma.passwordResetToken.deleteMany({
    where: { email, token: hashPasswordResetToken(token) },
  })
}

export async function consumePasswordResetToken(
  token: string,
  password: string,
  now?: Date,
): Promise<PasswordResetTokenResult> {
  const tokenHash = hashPasswordResetToken(token)
  const select = { id: true, email: true, expires: true }
  let resetToken = await prisma.passwordResetToken.findUnique({
    where: { token: tokenHash },
    select,
  })
  if (!resetToken) {
    resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      select,
    })
  }

  const checkedAt = now ?? new Date()
  if (!resetToken) return 'invalid'
  if (resetToken.expires <= checkedAt) {
    await prisma.passwordResetToken.deleteMany({
      where: { id: resetToken.id, expires: { lte: checkedAt } },
    })
    return 'expired'
  }

  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS)
  const consumed = await prisma.$transaction(async (transaction) => {
    const result = await transaction.passwordResetToken.deleteMany({
      where: { id: resetToken.id, expires: { gt: now ?? new Date() } },
    })
    if (result.count !== 1) return false

    await transaction.user.update({
      where: { email: resetToken.email },
      data: { hashedPassword },
    })
    return true
  })

  return consumed ? 'updated' : 'invalid'
}

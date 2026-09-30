import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'

const SESSION_LIFETIME_SECONDS = 7 * 24 * 60 * 60
const sessionPayloadSchema = z.object({
  accountType: z.literal('CUSTOMER'),
  organizationId: z.string().min(1),
  verifiedEmail: z.string().email(),
  expiresAt: z.number().int().positive(),
  nonce: z.string().min(1),
})

export interface CustomerPortalSession {
  accountType: 'CUSTOMER'
  organizationId: string
  verifiedEmail: string
  expiresAt: number
}

export function normalizeCustomerEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function getCustomerPortalSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET
  if (!secret) throw new Error('NEXTAUTH_SECRET or AUTH_SECRET is required for the customer portal')
  return secret
}

export function hashOtp(code: string, secret: string): string {
  if (!secret) throw new Error('A secret is required to hash customer portal OTPs')
  return createHmac('sha256', secret).update(`customer-portal:otp:${code}`).digest('hex')
}

export function verifyOtpHash(code: string, storedHash: string, secret: string): boolean {
  const candidate = Buffer.from(hashOtp(code, secret), 'hex')
  const stored = Buffer.from(storedHash, 'hex')
  return candidate.length === stored.length && timingSafeEqual(candidate, stored)
}

export function hashRateLimitKey(scope: string, value: string, secret: string): string {
  if (!secret) throw new Error('A secret is required to hash customer portal rate-limit keys')
  return createHmac('sha256', secret)
    .update(`customer-portal:rate-limit:${scope}:${value}`)
    .digest('hex')
}

function signSessionPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(`customer-portal:session:${payload}`).digest('base64url')
}

export function createCustomerPortalSession(input: {
  organizationId: string
  verifiedEmail: string
  secret: string
  now?: Date
  expiresInSeconds?: number
}): string {
  if (!input.secret) throw new Error('A secret is required to sign customer portal sessions')
  const lifetime = input.expiresInSeconds ?? SESSION_LIFETIME_SECONDS
  if (!Number.isInteger(lifetime) || lifetime <= 0) {
    throw new Error('Customer portal session lifetime must be a positive integer')
  }

  const payload = Buffer.from(JSON.stringify({
    accountType: 'CUSTOMER',
    organizationId: input.organizationId,
    verifiedEmail: normalizeCustomerEmail(input.verifiedEmail),
    expiresAt: (input.now ?? new Date()).getTime() + lifetime * 1000,
    nonce: randomBytes(16).toString('base64url'),
  })).toString('base64url')

  return `${payload}.${signSessionPayload(payload, input.secret)}`
}

export function verifyCustomerPortalSession(
  token: string | null | undefined,
  secret: string,
  now = new Date(),
): CustomerPortalSession | null {
  if (!token || !secret || token.length > 4096) return null
  const [payload, signature, extra] = token.split('.')
  if (!payload || !signature || extra !== undefined) return null

  const expectedSignature = signSessionPayload(payload, secret)
  const actualBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expectedSignature)
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null
  }

  try {
    const parsed = sessionPayloadSchema.safeParse(JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')))
    if (!parsed.success || parsed.data.expiresAt <= now.getTime()) return null
    return {
      accountType: parsed.data.accountType,
      organizationId: parsed.data.organizationId,
      verifiedEmail: normalizeCustomerEmail(parsed.data.verifiedEmail),
      expiresAt: parsed.data.expiresAt,
    }
  } catch {
    return null
  }
}

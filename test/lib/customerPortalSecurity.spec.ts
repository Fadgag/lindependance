import { describe, expect, it } from 'vitest'
import {
  createCustomerPortalSession,
  hashOtp,
  verifyCustomerPortalSession,
} from '@/lib/customerPortalSecurity'

const SECRET = 'test-secret-that-is-long-enough-to-sign'

describe('customer portal authentication primitives', () => {
  it('stores only an HMAC of the numeric OTP and verifies it with the same secret', () => {
    const hash = hashOtp('042817', SECRET)

    expect(hash).not.toContain('042817')
    expect(hashOtp('042817', SECRET)).toBe(hash)
    expect(hashOtp('042817', 'different-secret')).not.toBe(hash)
  })

  it('signs a customer-only session without creating a staff identity', () => {
    const now = new Date('2026-09-30T12:00:00.000Z')
    const token = createCustomerPortalSession({
      organizationId: 'org-123',
      verifiedEmail: ' Parent@Example.COM ',
      secret: SECRET,
      now,
    })
    const session = verifyCustomerPortalSession(token, SECRET, now)

    expect(session).toEqual({
      accountType: 'CUSTOMER',
      organizationId: 'org-123',
      verifiedEmail: 'parent@example.com',
      expiresAt: now.getTime() + 7 * 24 * 60 * 60 * 1000,
    })
  })

  it('rejects expired, modified, and differently signed session cookies', () => {
    const now = new Date('2026-09-30T12:00:00.000Z')
    const token = createCustomerPortalSession({
      organizationId: 'org-123',
      verifiedEmail: 'parent@example.com',
      secret: SECRET,
      now,
      expiresInSeconds: 60,
    })

    expect(verifyCustomerPortalSession(token, SECRET, new Date(now.getTime() + 60_000))).toBeNull()
    expect(verifyCustomerPortalSession(`${token.slice(0, -1)}x`, SECRET, now)).toBeNull()
    expect(verifyCustomerPortalSession(token, 'other-secret', now)).toBeNull()
  })
})

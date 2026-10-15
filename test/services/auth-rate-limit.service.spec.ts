import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  deleteRateLimits: vi.fn(),
  findUser: vi.fn(),
  comparePassword: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: mocks.queryRaw,
    authRateLimit: { deleteMany: mocks.deleteRateLimits },
    user: { findUnique: mocks.findUser },
  },
}))

vi.mock('bcryptjs', () => ({
  default: { compare: mocks.comparePassword },
}))

import {
  authorizeCredentials,
  consumeClientIpRateLimit,
  consumeAuthRateLimit,
} from '@/services/auth-rate-limit.service'
import { AUTH_RATE_LIMIT_POLICIES } from '@/domain/auth/rateLimit'

describe('authentication rate-limit service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXTAUTH_SECRET = 'test-auth-secret'
    mocks.deleteRateLimits.mockResolvedValue({ count: 0 })
  })

  it('blocks attempts over the configured limit and reports the remaining window', async () => {
    const now = new Date('2026-10-13T12:00:00.000Z')
    mocks.queryRaw.mockResolvedValue([{ count: 6, resetAt: new Date(now.getTime() + 30_000) }])

    await expect(
      consumeAuthRateLimit('login-email', 'person@example.com', AUTH_RATE_LIMIT_POLICIES.loginByEmail, now),
    ).resolves.toEqual({ allowed: false, retryAfterSeconds: 30 })
    expect(mocks.deleteRateLimits).toHaveBeenCalledOnce()
  })

  it('stops credential lookup after the IP limit is reached', async () => {
    mocks.queryRaw.mockResolvedValue([{ count: 11, resetAt: new Date(Date.now() + 60_000) }])

    await expect(
      authorizeCredentials(
        { email: 'person@example.com', password: 'secret-password' },
        new Request('https://example.test/api/auth/callback/credentials', {
          headers: { 'x-real-ip': '192.0.2.10' },
        }),
      ),
    ).resolves.toBeNull()

    expect(mocks.findUser).not.toHaveBeenCalled()
  })

  it('stops credential lookup after the per-email limit is reached', async () => {
    const resetAt = new Date(Date.now() + 60_000)
    mocks.queryRaw
      .mockResolvedValueOnce([{ count: 1, resetAt }])
      .mockResolvedValueOnce([{ count: 6, resetAt }])

    await expect(
      authorizeCredentials(
        { email: 'person@example.com', password: 'secret-password' },
        new Request('https://example.test/api/auth/callback/credentials', {
          headers: { 'x-real-ip': '192.0.2.10' },
        }),
      ),
    ).resolves.toBeNull()

    expect(mocks.queryRaw).toHaveBeenCalledTimes(2)
    expect(mocks.findUser).not.toHaveBeenCalled()
  })

  it('does not throttle all users through a shared bucket when no proxy IP is available', async () => {
    await expect(
      consumeClientIpRateLimit(
        'login-ip',
        new Request('https://example.test/api/auth/callback/credentials'),
        AUTH_RATE_LIMIT_POLICIES.loginByIp,
      ),
    ).resolves.toEqual({ allowed: true, retryAfterSeconds: 900 })

    expect(mocks.queryRaw).not.toHaveBeenCalled()
  })

  it('returns the same failed-authorization result for unknown users and wrong passwords', async () => {
    mocks.queryRaw.mockResolvedValue([{ count: 1, resetAt: new Date(Date.now() + 60_000) }])
    mocks.findUser
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'user-1', email: 'person@example.com', hashedPassword: 'hash', organizationId: null, role: 'USER' })
    mocks.comparePassword.mockResolvedValue(false)
    const request = new Request('https://example.test/api/auth/callback/credentials', {
      headers: { 'x-real-ip': '192.0.2.10' },
    })

    const unknownUser = await authorizeCredentials(
      { email: 'person@example.com', password: 'secret-password' },
      request,
    )
    const wrongPassword = await authorizeCredentials(
      { email: 'person@example.com', password: 'secret-password' },
      request,
    )

    expect(unknownUser).toBeNull()
    expect(wrongPassword).toBeNull()
    expect(mocks.comparePassword).toHaveBeenCalledTimes(2)
  })
})

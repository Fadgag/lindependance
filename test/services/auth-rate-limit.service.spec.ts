import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  passwordResetToken: {
    findUnique: vi.fn(),
    deleteMany: vi.fn(),
  },
  queryRaw: vi.fn(),
  deleteRateLimits: vi.fn(),
  findUser: vi.fn(),
  comparePassword: vi.fn(),
  hashPassword: vi.fn(),
  transaction: vi.fn(),
}))

const transactionClient = {
  passwordResetToken: mocks.passwordResetToken,
  user: { update: vi.fn() },
}

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: mocks.queryRaw,
    $transaction: mocks.transaction,
    authRateLimit: { deleteMany: mocks.deleteRateLimits },
    passwordResetToken: mocks.passwordResetToken,
    user: { findUnique: mocks.findUser },
  },
}))

vi.mock('bcryptjs', () => ({
  default: { compare: mocks.comparePassword, hash: mocks.hashPassword },
}))

import {
  authorizeCredentials,
  consumeClientIpRateLimit,
  consumeAuthRateLimit,
  consumePasswordResetToken,
  createOrReusePasswordResetToken,
  deletePasswordResetToken,
  getClientIp,
} from '@/services/auth-rate-limit.service'
import { AUTH_RATE_LIMIT_POLICIES } from '@/domain/auth/rateLimit'
import { hashPasswordResetToken } from '@/domain/auth/passwordResetToken'

describe('authentication rate-limit service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXTAUTH_SECRET = 'test-auth-secret'
    process.env.VERCEL = '1'
    delete process.env.TRUSTED_PROXY_IP
    mocks.deleteRateLimits.mockResolvedValue({ count: 0 })
    mocks.hashPassword.mockResolvedValue('new-hash')
    mocks.transaction.mockImplementation(async (operation) => operation(transactionClient))
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
          headers: { 'x-vercel-forwarded-for': '192.0.2.10' },
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
          headers: { 'x-vercel-forwarded-for': '192.0.2.10' },
        }),
      ),
    ).resolves.toBeNull()

    expect(mocks.queryRaw).toHaveBeenCalledTimes(2)
    expect(mocks.findUser).not.toHaveBeenCalled()
  })

  it('does not throttle all users through a shared bucket when no proxy IP is available', async () => {
    delete process.env.VERCEL
    await expect(
      consumeClientIpRateLimit(
        'login-ip',
        new Request('https://example.test/api/auth/callback/credentials', {
          headers: { 'x-real-ip': '192.0.2.10', 'x-forwarded-for': '192.0.2.11' },
        }),
        AUTH_RATE_LIMIT_POLICIES.loginByIp,
      ),
    ).resolves.toEqual({ allowed: true, retryAfterSeconds: 900 })

    expect(mocks.queryRaw).not.toHaveBeenCalled()
  })

  it('ignores client-supplied IP headers unless a trusted proxy is configured', () => {
    delete process.env.VERCEL

    expect(
      getClientIp(new Request('https://example.test', {
        headers: { 'x-real-ip': '192.0.2.10', 'x-forwarded-for': '192.0.2.11' },
      })),
    ).toBeNull()
  })

  it('uses only the Vercel-provided client IP and rejects forwarded chains', () => {
    const request = new Request('https://example.test', {
      headers: {
        'x-vercel-forwarded-for': '192.0.2.10',
        'x-real-ip': '192.0.2.11',
        'x-forwarded-for': '192.0.2.12',
      },
    })

    expect(getClientIp(request)).toBe('192.0.2.10')
    expect(
      getClientIp(new Request('https://example.test', {
        headers: { 'x-vercel-forwarded-for': '192.0.2.10, 192.0.2.11' },
      })),
    ).toBeNull()
  })

  it('uses only x-real-ip when self-hosting explicitly trusts the reverse proxy', () => {
    delete process.env.VERCEL
    process.env.TRUSTED_PROXY_IP = 'true'

    expect(
      getClientIp(new Request('https://example.test', {
        headers: {
          'x-real-ip': '192.0.2.10',
          'x-forwarded-for': '192.0.2.11',
        },
      })),
    ).toBe('192.0.2.10')
    expect(
      getClientIp(new Request('https://example.test', {
        headers: { 'x-real-ip': 'not-an-ip' },
      })),
    ).toBeNull()
  })

  it('keeps the per-email limit active when a trusted IP is unavailable', async () => {
    delete process.env.VERCEL
    mocks.queryRaw.mockResolvedValue([{ count: 6, resetAt: new Date(Date.now() + 60_000) }])

    await expect(
      authorizeCredentials(
        { email: 'person@example.com', password: 'secret-password' },
        new Request('https://example.test/api/auth/callback/credentials', {
          headers: { 'x-real-ip': '192.0.2.10' },
        }),
      ),
    ).resolves.toBeNull()

    expect(mocks.queryRaw).toHaveBeenCalledOnce()
    expect(mocks.findUser).not.toHaveBeenCalled()
  })

  it('returns the same failed-authorization result for unknown users and wrong passwords', async () => {
    mocks.queryRaw.mockResolvedValue([{ count: 1, resetAt: new Date(Date.now() + 60_000) }])
    mocks.findUser
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'user-1', email: 'person@example.com', hashedPassword: 'hash', organizationId: null, role: 'USER' })
    mocks.comparePassword.mockResolvedValue(false)
    const request = new Request('https://example.test/api/auth/callback/credentials', {
      headers: { 'x-vercel-forwarded-for': '192.0.2.10' },
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

  it('stores only a prefixed SHA-256 token hash and returns the original token for delivery', async () => {
    const token = 'a'.repeat(64)
    const tokenHash = hashPasswordResetToken(token)
    mocks.queryRaw.mockResolvedValue([{ token: tokenHash }])

    await expect(
      createOrReusePasswordResetToken(
        'person@example.com',
        token,
        new Date('2026-10-15T21:00:00.000Z'),
      ),
    ).resolves.toEqual({ token, created: true })

    const query = mocks.queryRaw.mock.calls[0]?.[0]
    expect(query).toMatchObject({ values: expect.arrayContaining([tokenHash]) })
    expect(query).not.toMatchObject({ values: expect.arrayContaining([token]) })
  })

  it('deletes an unsent reset token by its hash, not its plaintext value', async () => {
    const token = 'e'.repeat(64)

    await deletePasswordResetToken('person@example.com', token)

    expect(mocks.passwordResetToken.deleteMany).toHaveBeenCalledWith({
      where: { email: 'person@example.com', token: hashPasswordResetToken(token) },
    })
  })

  it('atomically consumes an active reset token before updating the password', async () => {
    const token = 'b'.repeat(64)
    const now = new Date('2026-10-15T20:00:00.000Z')
    mocks.passwordResetToken.findUnique.mockResolvedValue({
      id: 'reset-1',
      email: 'person@example.com',
      expires: new Date(now.getTime() + 60_000),
    })
    mocks.passwordResetToken.deleteMany.mockResolvedValue({ count: 1 })
    transactionClient.user.update.mockResolvedValue({ id: 'user-1' })

    await expect(consumePasswordResetToken(token, 'new-password', now)).resolves.toBe('updated')

    expect(mocks.transaction).toHaveBeenCalledOnce()
    expect(mocks.passwordResetToken.findUnique).toHaveBeenCalledWith({
      where: { token: hashPasswordResetToken(token) },
      select: { id: true, email: true, expires: true },
    })
    expect(mocks.passwordResetToken.deleteMany).toHaveBeenCalledWith({
      where: { id: 'reset-1', expires: { gt: now } },
    })
    expect(mocks.hashPassword).toHaveBeenCalledWith('new-password', 12)
    expect(transactionClient.user.update).toHaveBeenCalledWith({
      where: { email: 'person@example.com' },
      data: { hashedPassword: 'new-hash' },
    })
  })

  it('rejects and removes expired reset tokens without changing the password', async () => {
    const now = new Date('2026-10-15T20:00:00.000Z')
    mocks.passwordResetToken.findUnique.mockResolvedValue({
      id: 'reset-1',
      email: 'person@example.com',
      expires: new Date(now.getTime() - 1),
    })
    mocks.passwordResetToken.deleteMany.mockResolvedValue({ count: 1 })

    await expect(consumePasswordResetToken('c'.repeat(64), 'new-password', now)).resolves.toBe('expired')

    expect(mocks.passwordResetToken.deleteMany).toHaveBeenCalledWith({
      where: { id: 'reset-1', expires: { lte: now } },
    })
    expect(transactionClient.user.update).not.toHaveBeenCalled()
  })

  it('accepts a legacy plaintext token only as a fallback during the data migration', async () => {
    const token = 'f'.repeat(64)
    const now = new Date('2026-10-15T20:00:00.000Z')
    mocks.passwordResetToken.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'reset-legacy',
        email: 'person@example.com',
        expires: new Date(now.getTime() + 60_000),
      })
    mocks.passwordResetToken.deleteMany.mockResolvedValue({ count: 1 })
    transactionClient.user.update.mockResolvedValue({ id: 'user-1' })

    await expect(consumePasswordResetToken(token, 'new-password', now)).resolves.toBe('updated')

    expect(mocks.passwordResetToken.findUnique).toHaveBeenNthCalledWith(1, {
      where: { token: hashPasswordResetToken(token) },
      select: { id: true, email: true, expires: true },
    })
    expect(mocks.passwordResetToken.findUnique).toHaveBeenNthCalledWith(2, {
      where: { token },
      select: { id: true, email: true, expires: true },
    })
  })

  it('allows only one of two concurrent reset-token submissions to update the password', async () => {
    const token = 'd'.repeat(64)
    const now = new Date('2026-10-15T20:00:00.000Z')
    mocks.passwordResetToken.findUnique.mockResolvedValue({
      id: 'reset-1',
      email: 'person@example.com',
      expires: new Date(now.getTime() + 60_000),
    })
    mocks.passwordResetToken.deleteMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 })
    transactionClient.user.update.mockResolvedValue({ id: 'user-1' })

    await expect(Promise.all([
      consumePasswordResetToken(token, 'first-password', now),
      consumePasswordResetToken(token, 'second-password', now),
    ])).resolves.toEqual(['updated', 'invalid'])

    expect(transactionClient.user.update).toHaveBeenCalledOnce()
  })
})

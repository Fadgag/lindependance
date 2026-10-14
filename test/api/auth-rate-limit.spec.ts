import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const afterCallbacks: Array<() => Promise<void>> = []
  return {
    findUser: vi.fn(),
    findResetToken: vi.fn(),
    deleteResetToken: vi.fn(),
    updateUser: vi.fn(),
    consumeRateLimit: vi.fn(),
    consumeIpRateLimit: vi.fn(),
    createOrReuseResetToken: vi.fn(),
    deleteIssuedResetToken: vi.fn(),
    sendEmail: vi.fn(),
    loggerError: vi.fn(),
    afterCallbacks,
    scheduleAfter: vi.fn((callback: () => void | Promise<void>) => {
      afterCallbacks.push(async () => {
        await callback()
      })
    }),
  }
})

vi.mock('next/server', async () => {
  const actual = await vi.importActual<typeof import('next/server')>('next/server')
  return { ...actual, after: mocks.scheduleAfter }
})

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: mocks.findUser, update: mocks.updateUser },
    passwordResetToken: {
      findUnique: mocks.findResetToken,
      delete: mocks.deleteResetToken,
    },
  },
}))

vi.mock('@/services/auth-rate-limit.service', () => ({
  consumeAuthRateLimit: mocks.consumeRateLimit,
  consumeClientIpRateLimit: mocks.consumeIpRateLimit,
  createOrReusePasswordResetToken: mocks.createOrReuseResetToken,
  deletePasswordResetToken: mocks.deleteIssuedResetToken,
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: mocks.loggerError },
}))

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: mocks.sendEmail }
  },
}))

vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn().mockResolvedValue('new-hash') },
}))

import { POST as forgotPassword } from '@/app/api/auth/forgot-password/route'
import { POST as resetPassword } from '@/app/api/auth/reset-password/route'

function postRequest(path: string, body: object): Request {
  return new Request(`https://example.test${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-real-ip': '192.0.2.10' },
    body: JSON.stringify(body),
  })
}

async function runAfterCallbacks(): Promise<void> {
  const callbacks = mocks.afterCallbacks.splice(0)
  await Promise.all(callbacks.map((callback) => callback()))
}

describe('password recovery rate limits', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.afterCallbacks.length = 0
    process.env.RESEND_API_KEY = 'test-api-key'
    mocks.consumeIpRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 60 })
    mocks.consumeRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 60 })
    mocks.deleteResetToken.mockResolvedValue({ count: 1 })
    mocks.deleteIssuedResetToken.mockResolvedValue(undefined)
    mocks.sendEmail.mockResolvedValue({ data: { id: 'email-1' }, error: null })
  })

  it('returns the same public response for an unknown and an existing email', async () => {
    mocks.findUser
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ email: 'person@example.com' })
    mocks.createOrReuseResetToken.mockResolvedValue({
      token: 'already-issued-token',
      created: false,
    })

    const unknown = await forgotPassword(
      postRequest('/api/auth/forgot-password', { email: 'unknown@example.com' }),
    )
    const existing = await forgotPassword(
      postRequest('/api/auth/forgot-password', { email: 'person@example.com' }),
    )

    expect(unknown.status).toBe(200)
    expect(existing.status).toBe(200)
    await expect(unknown.json()).resolves.toEqual({ ok: true })
    await expect(existing.json()).resolves.toEqual({ ok: true })
    expect(mocks.findUser).not.toHaveBeenCalled()
    expect(mocks.scheduleAfter).toHaveBeenCalledTimes(2)
    await runAfterCallbacks()
    expect(mocks.findUser).toHaveBeenCalledTimes(2)
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it('does not issue another email while a reset link is still active', async () => {
    mocks.findUser.mockResolvedValue({ email: 'person@example.com' })
    mocks.createOrReuseResetToken.mockResolvedValue({
      token: 'already-issued-token',
      created: false,
    })

    await forgotPassword(
      postRequest('/api/auth/forgot-password', { email: 'person@example.com' }),
    )
    await runAfterCallbacks()
    await forgotPassword(
      postRequest('/api/auth/forgot-password', { email: 'person@example.com' }),
    )
    await runAfterCallbacks()

    expect(mocks.createOrReuseResetToken).toHaveBeenCalledTimes(2)
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it('sends only one email for a newly issued reset link', async () => {
    mocks.findUser.mockResolvedValue({ email: 'person@example.com' })
    mocks.createOrReuseResetToken
      .mockResolvedValueOnce({ token: 'issued-token', created: true })
      .mockResolvedValueOnce({ token: 'issued-token', created: false })

    await forgotPassword(
      postRequest('/api/auth/forgot-password', { email: 'person@example.com' }),
    )
    await runAfterCallbacks()
    await forgotPassword(
      postRequest('/api/auth/forgot-password', { email: 'person@example.com' }),
    )
    await runAfterCallbacks()

    expect(mocks.sendEmail).toHaveBeenCalledOnce()
  })

  it('removes the unsent token when the email provider throws', async () => {
    mocks.findUser.mockResolvedValue({ email: 'person@example.com' })
    mocks.createOrReuseResetToken.mockResolvedValue({
      token: 'unsent-token',
      created: true,
    })
    mocks.sendEmail.mockRejectedValue(new Error('provider unavailable'))

    const response = await forgotPassword(
      postRequest('/api/auth/forgot-password', { email: 'person@example.com' }),
    )
    await runAfterCallbacks()

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true })
    expect(mocks.deleteIssuedResetToken).toHaveBeenCalledWith(
      'person@example.com',
      'unsent-token',
    )
  })

  it('keeps throttled reset requests indistinguishable from successful submissions', async () => {
    mocks.consumeRateLimit.mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 3600 })

    const response = await forgotPassword(
      postRequest('/api/auth/forgot-password', { email: 'person@example.com' }),
    )
    await runAfterCallbacks()

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true })
    expect(mocks.findUser).not.toHaveBeenCalled()
  })

  it('returns 429 and Retry-After for repeated reset-token submissions', async () => {
    mocks.consumeIpRateLimit.mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 900 })

    const response = await resetPassword(
      postRequest('/api/auth/reset-password', {
        token: 'a'.repeat(64),
        password: 'new-password',
      }),
    )

    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBe('900')
    expect(mocks.findResetToken).not.toHaveBeenCalled()
  })

  it('applies the token-specific reset-submission limit after the IP limit', async () => {
    mocks.consumeIpRateLimit
      .mockResolvedValueOnce({ allowed: true, retryAfterSeconds: 900 })
    mocks.consumeRateLimit.mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 600 })

    const response = await resetPassword(
      postRequest('/api/auth/reset-password', {
        token: 'a'.repeat(64),
        password: 'new-password',
      }),
    )

    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBe('600')
    expect(mocks.findResetToken).not.toHaveBeenCalled()
  })
})

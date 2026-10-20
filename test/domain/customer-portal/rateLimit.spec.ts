import { describe, expect, it } from 'vitest'
import {
  getCustomerPortalOtpRateLimits,
  isRateLimitExceeded,
} from '@/domain/customer-portal/rateLimit'

describe('getCustomerPortalOtpRateLimits', () => {
  it('uses the expanded limits only on the preprod Vercel preview', () => {
    expect(getCustomerPortalOtpRateLimits({
      vercelEnvironment: 'preview',
      gitCommitRef: 'preprod',
    })).toEqual({ emailLimit: 10, ipLimit: 30 })
  })

  it.each([
    { vercelEnvironment: 'production', gitCommitRef: 'preprod' },
    { vercelEnvironment: 'preview', gitCommitRef: 'feature/other' },
    { vercelEnvironment: undefined, gitCommitRef: undefined },
  ])('keeps standard limits outside preprod preview (%o)', (environment) => {
    expect(getCustomerPortalOtpRateLimits(environment)).toEqual({
      emailLimit: 3,
      ipLimit: 10,
    })
  })
})

describe('isRateLimitExceeded', () => {
  const now = new Date('2026-09-30T12:00:00.000Z')

  it('enforces a sliding window and permits the request that reaches the limit', () => {
    const events = [
      new Date(now.getTime() - 14 * 60_000),
      new Date(now.getTime() - 10 * 60_000),
      new Date(now.getTime() - 2 * 60_000),
    ]

    expect(isRateLimitExceeded(events, now, 15 * 60_000, 3)).toBe(true)
    expect(isRateLimitExceeded(events.slice(1), now, 15 * 60_000, 3)).toBe(false)
  })

  it('does not count events outside the window or in the future', () => {
    const events = [
      new Date(now.getTime() - 16 * 60_000),
      new Date(now.getTime() + 1_000),
    ]

    expect(isRateLimitExceeded(events, now, 15 * 60_000, 1)).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'
import {
  AUTH_RATE_LIMIT_POLICIES,
  isWithinRateLimit,
  normalizeRateLimitEmail,
} from '@/domain/auth/rateLimit'

describe('authentication rate-limit policy', () => {
  it('defines bounded windows for password login, reset requests, and reset submissions', () => {
    expect(AUTH_RATE_LIMIT_POLICIES.loginByIp).toEqual({ maxAttempts: 10, windowMs: 15 * 60 * 1000 })
    expect(AUTH_RATE_LIMIT_POLICIES.loginByEmail).toEqual({ maxAttempts: 5, windowMs: 15 * 60 * 1000 })
    expect(AUTH_RATE_LIMIT_POLICIES.resetRequestByIp).toEqual({ maxAttempts: 10, windowMs: 60 * 60 * 1000 })
    expect(AUTH_RATE_LIMIT_POLICIES.resetRequestByEmail).toEqual({ maxAttempts: 3, windowMs: 60 * 60 * 1000 })
    expect(AUTH_RATE_LIMIT_POLICIES.resetSubmitByIp).toEqual({ maxAttempts: 10, windowMs: 15 * 60 * 1000 })
    expect(AUTH_RATE_LIMIT_POLICIES.resetSubmitByToken).toEqual({ maxAttempts: 5, windowMs: 15 * 60 * 1000 })
  })

  it('allows attempts up to the configured maximum, then blocks them', () => {
    const policy = { maxAttempts: 5, windowMs: 60_000 }

    expect(isWithinRateLimit(4, policy)).toBe(true)
    expect(isWithinRateLimit(5, policy)).toBe(true)
    expect(isWithinRateLimit(6, policy)).toBe(false)
  })

  it('normalizes email identifiers consistently without changing their meaning', () => {
    expect(normalizeRateLimitEmail('  Person@Example.COM ')).toBe('person@example.com')
  })
})

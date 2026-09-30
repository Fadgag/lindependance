import { describe, expect, it } from 'vitest'
import { isRateLimitExceeded } from '@/domain/customer-portal/rateLimit'

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

export type RateLimitPolicy = {
  maxAttempts: number
  windowMs: number
}

export const AUTH_RATE_LIMIT_POLICIES = {
  loginByIp: { maxAttempts: 10, windowMs: 15 * 60 * 1000 },
  loginByEmail: { maxAttempts: 5, windowMs: 15 * 60 * 1000 },
  resetRequestByIp: { maxAttempts: 10, windowMs: 60 * 60 * 1000 },
  resetRequestByEmail: { maxAttempts: 3, windowMs: 60 * 60 * 1000 },
  resetSubmitByIp: { maxAttempts: 10, windowMs: 15 * 60 * 1000 },
  resetSubmitByToken: { maxAttempts: 5, windowMs: 15 * 60 * 1000 },
} satisfies Record<string, RateLimitPolicy>

export function isWithinRateLimit(count: number, policy: RateLimitPolicy): boolean {
  return count <= policy.maxAttempts
}

export function normalizeRateLimitEmail(email: string): string {
  return email.trim().toLowerCase()
}

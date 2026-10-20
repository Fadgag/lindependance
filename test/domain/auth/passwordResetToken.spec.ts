import { describe, expect, it } from 'vitest'
import {
  hashPasswordResetToken,
  isHashedPasswordResetToken,
} from '@/domain/auth/passwordResetToken'

describe('password reset token hashing', () => {
  it('creates a stable, prefixed SHA-256 digest without exposing the token', () => {
    const token = 'a'.repeat(64)
    const digest = hashPasswordResetToken(token)

    expect(digest).toBe('sha256:ffe054fe7ae0cb6dc65c3af9b61d5209f439851db43d0ba5997337df154668eb')
    expect(digest).not.toContain(token)
    expect(hashPasswordResetToken(token)).toBe(digest)
    expect(isHashedPasswordResetToken(digest)).toBe(true)
    expect(isHashedPasswordResetToken(token)).toBe(false)
  })
})

import { createHash } from 'node:crypto'

const PASSWORD_RESET_TOKEN_HASH_PREFIX = 'sha256:'
const HASHED_PASSWORD_RESET_TOKEN_PATTERN = /^sha256:[a-f0-9]{64}$/

export function hashPasswordResetToken(token: string): string {
  const digest = createHash('sha256').update(token).digest('hex')
  return `${PASSWORD_RESET_TOKEN_HASH_PREFIX}${digest}`
}

export function isHashedPasswordResetToken(token: string): boolean {
  return HASHED_PASSWORD_RESET_TOKEN_PATTERN.test(token)
}

// Simple script to ensure NEXTAUTH_SECRET is set in production/CI
const { env } = process

if ((env.NODE_ENV === 'production' || env.CI) && !env.NEXTAUTH_SECRET) {
  // In CI or production, treat missing secret as fatal
  console.error('FATAL: NEXTAUTH_SECRET is not defined. Set NEXTAUTH_SECRET in your environment.')
  process.exit(1)
}

if (!env.NEXTAUTH_SECRET) {
  console.warn('Warning: NEXTAUTH_SECRET is not set. In development this may be acceptable but is insecure.')
}



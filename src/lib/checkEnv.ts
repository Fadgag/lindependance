// Small utility to ensure required env vars are set.
export function ensureNextAuthSecret() {
  // Accept either NEXTAUTH_SECRET or AUTH_SECRET so different consumers of
  // the codebase (next-auth, @auth/core, custom middleware) can read the
  // same secret under either variable name. In production we require at
  // least one to be defined.
  const hasSecret = Boolean(process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET)
  if (process.env.NODE_ENV === 'production' && !hasSecret) {
    // Crash early in production to avoid running without a secret
    console.error('FATAL: NEXTAUTH_SECRET or AUTH_SECRET is not defined in production environment')
    throw new Error('NEXTAUTH_SECRET or AUTH_SECRET is required in production')
  }
  // In dev, warn if missing
  if (!hasSecret) {
    console.warn('Warning: NEXTAUTH_SECRET/AUTH_SECRET is not set. Token validation may not work as expected in dev/test.')
  }

  // In development, also warn if both are present but differ to avoid confusion
  if (process.env.NODE_ENV !== 'production' && process.env.NEXTAUTH_SECRET && process.env.AUTH_SECRET && process.env.NEXTAUTH_SECRET !== process.env.AUTH_SECRET) {
    console.warn('Warning: NEXTAUTH_SECRET and AUTH_SECRET are both set but have different values. Ensure they are identical in dev to avoid cookie/token mismatches.')
  }
}


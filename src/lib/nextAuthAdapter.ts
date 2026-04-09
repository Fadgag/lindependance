// Lightweight adapter expected by tests and runtime code.
// Tests use vi.mock('../src/lib/nextAuthAdapter') so providing a stable module
// here ensures vitest can intercept it reliably.

/**
 * Try to extract a token using next-auth/jwt when available.
 * We avoid `any` and `node-fetch` here: inputs are treated as `unknown` and
 * narrowed at runtime to keep the adapter resilient across environments.
 */
export async function getTokenFromRequest(req: unknown): Promise<Record<string, unknown> | null> {
  const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET
  try {
    const m: unknown = await import('next-auth/jwt')
    // narrow to an object and pick getToken
    const maybeGetToken = (m as Record<string, unknown>)['getToken']
    if (typeof maybeGetToken !== 'function') return null
    const getToken = maybeGetToken as (opts: { req?: unknown; secret?: string }) => Promise<unknown>
    const tokenRaw = await getToken({ req, secret })
    if (!tokenRaw || typeof tokenRaw !== 'object') return null
    return tokenRaw as Record<string, unknown>
  } catch {
    return null
  }
}

export async function getTypedServerSession(): Promise<Record<string, unknown> | null> {
  try {
    const m: unknown = await import('next-auth/next')
    const maybeGetServerSession = (m as Record<string, unknown>)['getServerSession']
    if (typeof maybeGetServerSession !== 'function') return null
    const getServerSession = maybeGetServerSession as () => Promise<unknown>
    const session = await getServerSession()
    if (!session || typeof session !== 'object') return null
    return session as Record<string, unknown>
  } catch {
    return null
  }
}

const nextAuthAdapter = { getTokenFromRequest, getTypedServerSession }
export default nextAuthAdapter


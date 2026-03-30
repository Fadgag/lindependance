export type Session = {
  userId: string
  organizationId: string | null
  roles?: string[]
}

/**
 * Minimal session extractor used by API routes.
 *
 * Behaviour:
 * - Expects an Authorization header `Bearer <token>` (token can be any string identifying the user)
 * - Expects an `x-organization-id` header containing the current organization id
 *
 * This is deliberately minimal: replace or adapt to your real auth (next-auth, JWT verification, cookies).
 */
export async function getSessionFromRequest(req: Request): Promise<Session | null> {
  const auth = req.headers.get('authorization') || ''
  const org = req.headers.get('x-organization-id') || null
  if (!auth) return null
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth
  // In a real app, verify the token and resolve the user & organization.
  return {
    userId: token,
    organizationId: org,
    roles: []
  }
}

export default getSessionFromRequest


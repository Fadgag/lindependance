export function hasTechAdminAccess(session: {
  user?: {
    role?: string | null
    accountType?: string | null
  } | null
} | null): boolean {
  return session?.user?.accountType === 'STAFF' && session.user.role === 'TECH_ADMIN'
}

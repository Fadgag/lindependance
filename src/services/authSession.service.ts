import type { User } from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'

export async function refreshAuthTokenClaims(
  token: JWT,
  authenticatedUser?: User,
): Promise<JWT | null> {
  const userId = authenticatedUser?.id
    ?? (typeof token.id === 'string' ? token.id : token.sub)
  if (!userId) return token

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { organizationId: true, role: true },
  })
  if (!currentUser) return null

  return {
    ...token,
    id: userId,
    organizationId: currentUser.organizationId,
    role: currentUser.role,
    accountType: 'STAFF',
  }
}

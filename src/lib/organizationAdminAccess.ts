import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

type OrganizationAdminAccess =
  | { authorized: false; status: 401 | 403 }
  | { authorized: true; userId: string; organizationId: string }

export async function getOrganizationAdminAccess(): Promise<OrganizationAdminAccess> {
  const session = await auth()
  if (!session?.user) return { authorized: false, status: 401 }
  if (session.user.accountType !== 'STAFF') return { authorized: false, status: 403 }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, organizationId: true },
  })
  if (!user || user.role !== 'ADMIN' || !user.organizationId) {
    return { authorized: false, status: 403 }
  }

  return {
    authorized: true,
    userId: session.user.id,
    organizationId: user.organizationId,
  }
}

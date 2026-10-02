import { auth } from '@/auth'
import { hasTechAdminAccess } from '@/domain/test-feedback/access'
import { prisma } from '@/lib/prisma'
import type { Session } from 'next-auth'

type TestCampaignAccess =
  | { authorized: false; status: 401 | 403 }
  | { authorized: true; session: Session }

export async function getTestCampaignAdminAccess(): Promise<TestCampaignAccess> {
  const session = await auth()
  if (!session?.user) return { authorized: false, status: 401 }
  if (session.user.accountType !== 'STAFF') return { authorized: false, status: 403 }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })
  if (!user || !hasTechAdminAccess({ user: { role: user.role, accountType: session.user.accountType } })) {
    return { authorized: false, status: 403 }
  }
  return { authorized: true, session }
}

import { prisma } from '@/lib/prisma'

export async function listTechAdminOrganizations() {
  const organizations = await prisma.organization.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      users: {
        where: { role: 'ADMIN' },
        select: { id: true },
      },
    },
  })
  return organizations.map(({ users, ...organization }) => ({
    ...organization,
    hasAdmin: users.length > 0,
  }))
}

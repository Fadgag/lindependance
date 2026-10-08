import { prisma } from '@/lib/prisma'

export async function listTechAdminOrganizations() {
  return prisma.organization.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })
}

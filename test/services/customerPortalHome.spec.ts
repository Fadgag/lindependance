import { beforeEach, describe, expect, it, vi } from 'vitest'

const { findMany } = vi.hoisted(() => ({
  findMany: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: { organization: { findMany } },
}))

import { findDefaultEnabledPortalOrganization } from '@/services/customerPortal.service'
import { prisma } from '@/lib/prisma'

beforeEach(() => {
  vi.resetAllMocks()
})

describe('findDefaultEnabledPortalOrganization', () => {
  it('returns the slug when exactly one enabled portal exists', async () => {
    vi.mocked(prisma.organization.findMany).mockResolvedValue([{ slug: 'osezletre' }] as never)

    await expect(findDefaultEnabledPortalOrganization()).resolves.toEqual({ slug: 'osezletre' })
    expect(prisma.organization.findMany).toHaveBeenCalledWith({
      where: { portalEnabled: true, slug: { not: null } },
      select: { slug: true },
      take: 2,
    })
  })

  it.each([
    ['no enabled portal', []],
    ['multiple enabled portals', [{ slug: 'first' }, { slug: 'second' }]],
    ['portal with no slug', [{ slug: null }]],
  ])('returns null for %s', async (_description, organizations) => {
    vi.mocked(prisma.organization.findMany).mockResolvedValue(organizations as never)

    await expect(findDefaultEnabledPortalOrganization()).resolves.toBeNull()
  })
})

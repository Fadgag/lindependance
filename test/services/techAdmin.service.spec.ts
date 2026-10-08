import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  organizationFindMany: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: { organization: { findMany: mocks.organizationFindMany } },
}))

import { listTechAdminOrganizations } from '@/services/techAdmin.service'

describe('tech admin service', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.organizationFindMany.mockResolvedValue([
      { id: 'org-1', name: 'Salon A' },
      { id: 'org-2', name: 'Salon B' },
    ])
  })

  it('lists all organizations with only the fields needed by the domain selector', async () => {
    await expect(listTechAdminOrganizations()).resolves.toEqual([
      { id: 'org-1', name: 'Salon A' },
      { id: 'org-2', name: 'Salon B' },
    ])
    expect(mocks.organizationFindMany).toHaveBeenCalledWith({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    })
  })
})

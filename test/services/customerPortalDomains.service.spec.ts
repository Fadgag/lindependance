import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  domainFindUnique: vi.fn(),
  domainFindMany: vi.fn(),
  domainCreate: vi.fn(),
  domainDeleteMany: vi.fn(),
  organizationFindFirst: vi.fn(),
  organizationFindMany: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    customerPortalDomain: {
      findUnique: mocks.domainFindUnique,
      findMany: mocks.domainFindMany,
      create: mocks.domainCreate,
      deleteMany: mocks.domainDeleteMany,
    },
    organization: {
      findFirst: mocks.organizationFindFirst,
      findMany: mocks.organizationFindMany,
    },
  },
}))

import {
  createTechAdminPortalDomain,
  deleteTechAdminPortalDomain,
  findCustomerPortalDomainMapping,
  listTechAdminPortalDomains,
} from '@/services/customerPortalDomains.service'

beforeEach(() => {
  vi.resetAllMocks()
})

describe('findCustomerPortalDomainMapping', () => {
  it('normalizes the hostname before looking up the database association', async () => {
    mocks.domainFindUnique.mockResolvedValue({
      organization: { slug: 'osezletre' },
    })

    await expect(findCustomerPortalDomainMapping(' Testing.OsezLetre.fr. ')).resolves.toEqual({
      status: 'mapped',
      organizationSlug: 'osezletre',
    })
    expect(mocks.domainFindUnique).toHaveBeenCalledWith({
      where: { hostname: 'testing.osezletre.fr' },
      select: { organization: { select: { slug: true } } },
    })
  })

  it('distinguishes an unmapped host from a mapped organization without a slug', async () => {
    await expect(findCustomerPortalDomainMapping('unknown.example.fr'))
      .resolves.toEqual({ status: 'unmapped' })
    expect(mocks.domainFindUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { hostname: 'unknown.example.fr' },
    }))

    mocks.domainFindUnique.mockResolvedValueOnce({ organization: { slug: null } })
    await expect(findCustomerPortalDomainMapping('known.example.fr'))
      .resolves.toEqual({ status: 'mapped', organizationSlug: null })
  })

  it('does not query for an invalid hostname', async () => {
    await expect(findCustomerPortalDomainMapping('https://example.fr/path'))
      .resolves.toEqual({ status: 'unmapped' })
    expect(mocks.domainFindUnique).not.toHaveBeenCalled()
  })
})

describe('listTechAdminPortalDomains', () => {
  it('lists associations and only currently bookable portals as assignment choices', async () => {
    mocks.domainFindMany.mockResolvedValue([{
      id: 'domain-1',
      hostname: 'testing.osezletre.fr',
      organizationId: 'org-1',
      organization: {
        name: 'Osez l’Etre',
        slug: 'osezletre',
        portalEnabled: true,
        staff: [{ id: 'staff-1' }],
      },
    }])
    mocks.organizationFindMany.mockResolvedValue([{
      id: 'org-1',
      name: 'Osez l’Etre',
      slug: 'osezletre',
    }])

    await expect(listTechAdminPortalDomains()).resolves.toEqual({
      domains: [{
        id: 'domain-1',
        hostname: 'testing.osezletre.fr',
        organizationId: 'org-1',
        organizationName: 'Osez l’Etre',
        organizationSlug: 'osezletre',
        portalAvailable: true,
      }],
      organizations: [{ id: 'org-1', name: 'Osez l’Etre', slug: 'osezletre' }],
    })
    expect(mocks.domainFindMany).toHaveBeenCalledWith(expect.objectContaining({
      orderBy: { hostname: 'asc' },
    }))
    expect(mocks.organizationFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        portalEnabled: true,
        slug: { not: null },
        staff: { some: { active: true } },
      },
    }))
  })
})

describe('createTechAdminPortalDomain', () => {
  it('normalizes the hostname and only associates an active portal', async () => {
    mocks.organizationFindFirst.mockResolvedValue({ id: 'org-1' })
    mocks.domainCreate.mockResolvedValue({
      id: 'domain-1',
      hostname: 'testing.osezletre.fr',
    })

    await expect(createTechAdminPortalDomain({
      hostname: ' Testing.OsezLetre.fr. ',
      organizationId: 'org-1',
    })).resolves.toEqual({
      id: 'domain-1',
      hostname: 'testing.osezletre.fr',
    })
    expect(mocks.organizationFindFirst).toHaveBeenCalledWith({
      where: {
        id: 'org-1',
        portalEnabled: true,
        slug: { not: null },
        staff: { some: { active: true } },
      },
      select: { id: true },
    })
    expect(mocks.domainCreate).toHaveBeenCalledWith({
      data: { hostname: 'testing.osezletre.fr', organizationId: 'org-1' },
      select: { id: true, hostname: true },
    })
  })

  it('rejects malformed hostnames and organizations without an active portal', async () => {
    await expect(createTechAdminPortalDomain({
      hostname: 'https://example.fr/path',
      organizationId: 'org-1',
    })).rejects.toMatchObject({ status: 400 })
    expect(mocks.organizationFindFirst).not.toHaveBeenCalled()

    mocks.organizationFindFirst.mockResolvedValue(null)
    await expect(createTechAdminPortalDomain({
      hostname: 'example.fr',
      organizationId: 'org-1',
    })).rejects.toMatchObject({ status: 400 })
    expect(mocks.domainCreate).not.toHaveBeenCalled()
  })

  it('reports duplicate hostnames as a conflict', async () => {
    mocks.organizationFindFirst.mockResolvedValue({ id: 'org-1' })
    mocks.domainCreate.mockRejectedValue({ code: 'P2002' })

    await expect(createTechAdminPortalDomain({
      hostname: 'example.fr',
      organizationId: 'org-1',
    })).rejects.toMatchObject({ status: 409 })
  })
})

describe('deleteTechAdminPortalDomain', () => {
  it('reports whether an association was removed', async () => {
    mocks.domainDeleteMany.mockResolvedValue({ count: 1 })
    await expect(deleteTechAdminPortalDomain('domain-1')).resolves.toBe(true)
    expect(mocks.domainDeleteMany).toHaveBeenCalledWith({ where: { id: 'domain-1' } })

    mocks.domainDeleteMany.mockResolvedValue({ count: 0 })
    await expect(deleteTechAdminPortalDomain('missing')).resolves.toBe(false)
  })
})

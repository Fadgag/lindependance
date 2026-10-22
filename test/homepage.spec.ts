import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  findCustomerPortalDomainMapping,
  findDefaultEnabledPortalOrganization,
  findEnabledPortalOrganization,
  headers,
  redirect,
} = vi.hoisted(() => ({
  findCustomerPortalDomainMapping: vi.fn(),
  findDefaultEnabledPortalOrganization: vi.fn(),
  findEnabledPortalOrganization: vi.fn(),
  headers: vi.fn(),
  redirect: vi.fn(),
}))

vi.mock('@/services/customerPortal.service', () => ({
  findDefaultEnabledPortalOrganization,
  findEnabledPortalOrganization,
}))
vi.mock('@/services/customerPortalDomains.service', () => ({
  findCustomerPortalDomainMapping,
}))

vi.mock('next/navigation', () => ({ redirect }))
vi.mock('next/headers', () => ({ headers }))

import HomePage from '@/app/page'

beforeEach(() => {
  vi.resetAllMocks()
  headers.mockResolvedValue(new Headers({ host: 'localhost:3000' }))
  findCustomerPortalDomainMapping.mockResolvedValue({ status: 'unmapped' })
  redirect.mockImplementation((destination: string) => {
    throw new Error(`NEXT_REDIRECT:${destination}`)
  })
})

describe('public home page', () => {
  it('routes a mapped hostname to its salon reservation page', async () => {
    headers.mockResolvedValue(new Headers({ host: 'testing.osezletre.fr' }))
    findCustomerPortalDomainMapping.mockResolvedValue({
      status: 'mapped',
      organizationSlug: 'osezletre',
    })
    findEnabledPortalOrganization.mockResolvedValue({ slug: 'osezletre' })

    await expect(HomePage()).rejects.toThrow('NEXT_REDIRECT:/portail/osezletre/reserver')
    expect(findCustomerPortalDomainMapping).toHaveBeenCalledWith('testing.osezletre.fr')
    expect(findEnabledPortalOrganization).toHaveBeenCalledWith('osezletre')
    expect(findDefaultEnabledPortalOrganization).not.toHaveBeenCalled()
  })

  it('does not fall back to a different salon when a mapped portal is unavailable', async () => {
    headers.mockResolvedValue(new Headers({ host: 'testing.osezletre.fr' }))
    findCustomerPortalDomainMapping.mockResolvedValue({
      status: 'mapped',
      organizationSlug: 'osezletre',
    })
    findEnabledPortalOrganization.mockResolvedValue(null)

    await expect(HomePage()).rejects.toThrow('NEXT_REDIRECT:/auth/signin')
    expect(findDefaultEnabledPortalOrganization).not.toHaveBeenCalled()
  })

  it('does not fall back to another salon when a mapped organization has no slug', async () => {
    headers.mockResolvedValue(new Headers({ host: 'testing.osezletre.fr' }))
    findCustomerPortalDomainMapping.mockResolvedValue({
      status: 'mapped',
      organizationSlug: null,
    })

    await expect(HomePage()).rejects.toThrow('NEXT_REDIRECT:/auth/signin')
    expect(findEnabledPortalOrganization).not.toHaveBeenCalled()
    expect(findDefaultEnabledPortalOrganization).not.toHaveBeenCalled()
  })

  it('redirects to the sole enabled organization reservation page', async () => {
    findDefaultEnabledPortalOrganization.mockResolvedValue({ slug: 'osezletre' })

    await expect(HomePage()).rejects.toThrow('NEXT_REDIRECT:/portail/osezletre/reserver')
    expect(redirect).toHaveBeenCalledWith('/portail/osezletre/reserver')
  })

  it('redirects to staff sign-in when no unambiguous enabled portal exists', async () => {
    findDefaultEnabledPortalOrganization.mockResolvedValue(null)

    await expect(HomePage()).rejects.toThrow('NEXT_REDIRECT:/auth/signin')
    expect(redirect).toHaveBeenCalledWith('/auth/signin')
  })
})

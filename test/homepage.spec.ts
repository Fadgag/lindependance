import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  findDefaultEnabledPortalOrganization,
  findEnabledPortalOrganization,
  headers,
  redirect,
} = vi.hoisted(() => ({
  findDefaultEnabledPortalOrganization: vi.fn(),
  findEnabledPortalOrganization: vi.fn(),
  headers: vi.fn(),
  redirect: vi.fn(),
}))

vi.mock('@/services/customerPortal.service', () => ({
  findDefaultEnabledPortalOrganization,
  findEnabledPortalOrganization,
}))

vi.mock('next/navigation', () => ({ redirect }))
vi.mock('next/headers', () => ({ headers }))

import HomePage from '@/app/page'

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('CUSTOMER_PORTAL_DOMAIN_MAP', '')
  headers.mockResolvedValue(new Headers({ host: 'localhost:3000' }))
  redirect.mockImplementation((destination: string) => {
    throw new Error(`NEXT_REDIRECT:${destination}`)
  })
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('public home page', () => {
  it('routes a mapped hostname to its salon reservation page', async () => {
    vi.stubEnv('CUSTOMER_PORTAL_DOMAIN_MAP', '{"testing.osezletre.fr":"osezletre"}')
    headers.mockResolvedValue(new Headers({ host: 'testing.osezletre.fr' }))
    findEnabledPortalOrganization.mockResolvedValue({ slug: 'osezletre' })

    await expect(HomePage()).rejects.toThrow('NEXT_REDIRECT:/portail/osezletre/reserver')
    expect(findEnabledPortalOrganization).toHaveBeenCalledWith('osezletre')
    expect(findDefaultEnabledPortalOrganization).not.toHaveBeenCalled()
  })

  it('does not fall back to a different salon when a mapped portal is unavailable', async () => {
    vi.stubEnv('CUSTOMER_PORTAL_DOMAIN_MAP', '{"testing.osezletre.fr":"osezletre"}')
    headers.mockResolvedValue(new Headers({ host: 'testing.osezletre.fr' }))
    findEnabledPortalOrganization.mockResolvedValue(null)

    await expect(HomePage()).rejects.toThrow('NEXT_REDIRECT:/auth/signin')
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

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { findDefaultEnabledPortalOrganization, redirect } = vi.hoisted(() => ({
  findDefaultEnabledPortalOrganization: vi.fn(),
  redirect: vi.fn(),
}))

vi.mock('@/services/customerPortal.service', () => ({
  findDefaultEnabledPortalOrganization,
}))

vi.mock('next/navigation', () => ({ redirect }))

import HomePage from '@/app/page'

beforeEach(() => {
  vi.resetAllMocks()
  redirect.mockImplementation((destination: string) => {
    throw new Error(`NEXT_REDIRECT:${destination}`)
  })
})

describe('public home page', () => {
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

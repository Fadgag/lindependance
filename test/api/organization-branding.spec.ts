import { beforeEach, describe, expect, it, vi } from 'vitest'

const { authMock, getBrandingMock, updateBrandingMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  getBrandingMock: vi.fn(),
  updateBrandingMock: vi.fn(),
}))

vi.mock('@/auth', () => ({ auth: authMock }))
vi.mock('@/services/organizationBranding.service', () => ({
  getOrganizationBranding: getBrandingMock,
  updateOrganizationBranding: updateBrandingMock,
}))

import { GET, PATCH } from '@/app/api/organization/branding/route'
import { auth } from '@/auth'
import {
  getOrganizationBranding,
  updateOrganizationBranding,
} from '@/services/organizationBranding.service'

function patch(body: Record<string, unknown>) {
  return new Request('https://example.test/api/organization/branding', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('/api/organization/branding', () => {
  it('returns the branding for the authenticated organization', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { organizationId: 'org-1', role: 'STAFF' },
    } as never)
    vi.mocked(getOrganizationBranding).mockResolvedValue({
      logoDataUrl: 'data:image/webp;base64,AA==',
      logoShape: 'circle',
      logoSize: 'medium',
      organizationName: 'Studio Étoile',
      showNameWithLogo: false,
    })

    const response = await GET()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      logoDataUrl: 'data:image/webp;base64,AA==',
      logoShape: 'circle',
      logoSize: 'medium',
      organizationName: 'Studio Étoile',
      showNameWithLogo: false,
    })
    expect(getOrganizationBranding).toHaveBeenCalledWith('org-1')
  })

  it('allows only admins to change branding and scopes the update to their organization', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { organizationId: 'org-1', role: 'ADMIN' },
    } as never)
    vi.mocked(updateOrganizationBranding).mockResolvedValue({
      logoDataUrl: null,
      logoShape: 'square',
      logoSize: 'large',
      organizationName: 'Nouveau salon',
      showNameWithLogo: true,
    })

    const response = await PATCH(patch({
      logoShape: 'square',
      organizationName: 'Nouveau salon',
      showNameWithLogo: true,
      organizationId: 'org-2',
    }))
    expect(response.status).toBe(400)
    expect(updateOrganizationBranding).not.toHaveBeenCalled()

    const validResponse = await PATCH(patch({
      logoShape: 'square',
      logoSize: 'large',
      organizationName: '  Nouveau salon  ',
      showNameWithLogo: true,
    }))

    expect(validResponse.status).toBe(200)
    expect(await validResponse.json()).toEqual({
      logoDataUrl: null,
      logoShape: 'square',
      logoSize: 'large',
      organizationName: 'Nouveau salon',
      showNameWithLogo: true,
    })
    expect(updateOrganizationBranding).toHaveBeenCalledWith('org-1', {
      logoShape: 'square',
      logoSize: 'large',
      organizationName: 'Nouveau salon',
      showNameWithLogo: true,
    })
  })

  it('rejects unauthenticated and non-admin update requests', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never)
    expect((await PATCH(patch({ logoShape: 'circle' }))).status).toBe(401)

    vi.mocked(auth).mockResolvedValueOnce({
      user: { organizationId: 'org-1', role: 'STAFF' },
    } as never)
    expect((await PATCH(patch({ logoShape: 'circle' }))).status).toBe(403)
    expect(updateOrganizationBranding).not.toHaveBeenCalled()
  })
})

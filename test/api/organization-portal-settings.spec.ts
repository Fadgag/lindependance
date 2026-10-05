import { beforeEach, describe, expect, it, vi } from 'vitest'

const { authMock, getSettingsMock, updateSettingsMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  getSettingsMock: vi.fn(),
  updateSettingsMock: vi.fn(),
}))

vi.mock('@/auth', () => ({ auth: authMock }))
vi.mock('@/services/customerPortalSettings.service', () => ({
  getOrganizationPortalSettings: getSettingsMock,
  updateOrganizationPortalSettings: updateSettingsMock,
}))

import { GET, PATCH } from '@/app/api/organization/portal/route'
import { auth } from '@/auth'
import {
  getOrganizationPortalSettings,
  updateOrganizationPortalSettings,
} from '@/services/customerPortalSettings.service'

const staffSession = {
  user: { organizationId: 'org-1', accountType: 'STAFF' },
}

function patch(body: Record<string, unknown>) {
  return new Request('https://example.test/api/organization/portal', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(auth).mockResolvedValue(staffSession as never)
  vi.mocked(getOrganizationPortalSettings).mockResolvedValue({
    slug: 'atelier',
    portalEnabled: true,
    timezone: 'Europe/Paris',
    portalContactPhone: '+33123456789',
    portalContactEmail: null,
    activePractitionerCount: 1,
  })
})

describe('/api/organization/portal', () => {
  it('returns portal settings scoped to the authenticated staff organization', async () => {
    const response = await GET(new Request('https://example.test/api/organization/portal'))

    expect(await response.json()).toEqual({
      slug: 'atelier',
      portalEnabled: true,
      timezone: 'Europe/Paris',
      portalContactPhone: '+33123456789',
      portalContactEmail: null,
      activePractitionerCount: 1,
    })
    expect(getOrganizationPortalSettings).toHaveBeenCalledWith('org-1')
  })

  it('updates only the authenticated organization and forbids activation without a slug', async () => {
    vi.mocked(updateOrganizationPortalSettings).mockResolvedValue({
      status: 'updated',
      settings: {
        slug: 'atelier',
        portalEnabled: true,
        timezone: 'Europe/Paris',
        portalContactPhone: '+33123456789',
        portalContactEmail: null,
        activePractitionerCount: 1,
      },
    })

    const response = await PATCH(patch({
      slug: 'atelier',
      portalEnabled: true,
      timezone: 'Europe/Paris',
      portalContactPhone: '+33123456789',
      portalContactEmail: null,
    }))

    expect(response.status).toBe(200)
    expect(updateOrganizationPortalSettings).toHaveBeenCalledWith({
      organizationId: 'org-1',
      settings: {
        slug: 'atelier',
        portalEnabled: true,
        timezone: 'Europe/Paris',
        portalContactPhone: '+33123456789',
        portalContactEmail: null,
      },
    })

    const invalidResponse = await PATCH(patch({
      slug: null,
      portalEnabled: true,
      timezone: 'Europe/Paris',
      portalContactPhone: '+33123456789',
      portalContactEmail: null,
    }))
    expect(invalidResponse.status).toBe(400)
  })

  it('does not activate the portal when no active practitioner is configured', async () => {
    vi.mocked(updateOrganizationPortalSettings).mockResolvedValue({
      status: 'practitioner_required',
    })
    const response = await PATCH(patch({
      slug: 'atelier',
      portalEnabled: true,
      timezone: 'Europe/Paris',
      portalContactPhone: '+33123456789',
      portalContactEmail: null,
    }))

    expect(response.status).toBe(400)
    expect(updateOrganizationPortalSettings).toHaveBeenCalledOnce()
  })

  it('rejects customer sessions and client-supplied organization ids', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { organizationId: 'org-1', accountType: 'CUSTOMER' },
    } as never)
    expect((await GET(new Request('https://example.test'))).status).toBe(403)

    const response = await PATCH(patch({
      slug: 'atelier',
      portalEnabled: false,
      timezone: 'Europe/Paris',
      portalContactPhone: null,
      portalContactEmail: null,
      organizationId: 'other-org',
    }))
    expect(response.status).toBe(400)
    expect(updateOrganizationPortalSettings).not.toHaveBeenCalled()
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getAccess: vi.fn(),
  listDomains: vi.fn(),
  createDomain: vi.fn(),
  deleteDomain: vi.fn(),
}))

vi.mock('@/lib/testCampaignAccess', () => ({
  getTestCampaignAdminAccess: mocks.getAccess,
}))
vi.mock('@/services/customerPortalDomains.service', () => ({
  listTechAdminPortalDomains: mocks.listDomains,
  createTechAdminPortalDomain: mocks.createDomain,
  deleteTechAdminPortalDomain: mocks.deleteDomain,
}))

import { GET, POST } from '@/app/api/tech-admin/customer-portal-domains/route'
import { DELETE } from '@/app/api/tech-admin/customer-portal-domains/[id]/route'
import { getTestCampaignAdminAccess } from '@/lib/testCampaignAccess'
import {
  createTechAdminPortalDomain,
  deleteTechAdminPortalDomain,
  listTechAdminPortalDomains,
} from '@/services/customerPortalDomains.service'

const adminAccess = {
  authorized: true as const,
  session: {
    expires: '2026-10-07T12:00:00.000Z',
    user: {
      id: 'technical-admin',
      name: 'Technical Admin',
      email: 'admin@example.test',
      image: null,
      role: 'TECH_ADMIN',
      accountType: 'STAFF' as const,
    },
  },
}

function request(path: string, method: string, body?: string) {
  return new Request(`https://example.test${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body,
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(getTestCampaignAdminAccess).mockResolvedValue(adminAccess)
  vi.mocked(listTechAdminPortalDomains).mockResolvedValue({
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
  vi.mocked(createTechAdminPortalDomain).mockResolvedValue({
    id: 'domain-1',
    hostname: 'testing.osezletre.fr',
  })
  vi.mocked(deleteTechAdminPortalDomain).mockResolvedValue(true)
})

describe('GET /api/tech-admin/customer-portal-domains', () => {
  it('requires technical-admin access and disables caching', async () => {
    vi.mocked(getTestCampaignAdminAccess).mockResolvedValue({
      authorized: false,
      status: 403,
    })

    const forbidden = await GET()
    expect(forbidden.status).toBe(403)
    expect(listTechAdminPortalDomains).not.toHaveBeenCalled()

    vi.mocked(getTestCampaignAdminAccess).mockResolvedValue(adminAccess)
    const response = await GET()

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    expect(await response.json()).toEqual({
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
  })
})

describe('POST /api/tech-admin/customer-portal-domains', () => {
  it('validates input and creates an association for an authorized technical admin', async () => {
    expect((await POST(request('/api/tech-admin/customer-portal-domains', 'POST', '{'))).status).toBe(400)
    expect((await POST(request(
      '/api/tech-admin/customer-portal-domains',
      'POST',
      JSON.stringify({ hostname: 'https://example.fr/path', organizationId: 'org-1' }),
    ))).status).toBe(400)
    expect(createTechAdminPortalDomain).not.toHaveBeenCalled()

    const response = await POST(request(
      '/api/tech-admin/customer-portal-domains',
      'POST',
      JSON.stringify({ hostname: ' Testing.OsezLetre.fr. ', organizationId: 'org-1' }),
    ))

    expect(response.status).toBe(201)
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    expect(await response.json()).toEqual({
      id: 'domain-1',
      hostname: 'testing.osezletre.fr',
    })
    expect(createTechAdminPortalDomain).toHaveBeenCalledWith({
      hostname: 'testing.osezletre.fr',
      organizationId: 'org-1',
    })
  })

  it('does not allow a non-technical admin to create an association', async () => {
    vi.mocked(getTestCampaignAdminAccess).mockResolvedValue({
      authorized: false,
      status: 401,
    })

    const response = await POST(request(
      '/api/tech-admin/customer-portal-domains',
      'POST',
      JSON.stringify({ hostname: 'example.fr', organizationId: 'org-1' }),
    ))

    expect(response.status).toBe(401)
    expect(createTechAdminPortalDomain).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/tech-admin/customer-portal-domains/[id]', () => {
  const context = { params: Promise.resolve({ id: 'domain-1' }) }

  it('removes an association only for a technical admin', async () => {
    vi.mocked(getTestCampaignAdminAccess).mockResolvedValue({
      authorized: false,
      status: 403,
    })

    expect((await DELETE(request('/api/tech-admin/customer-portal-domains/domain-1', 'DELETE'), context)).status)
      .toBe(403)
    expect(deleteTechAdminPortalDomain).not.toHaveBeenCalled()

    vi.mocked(getTestCampaignAdminAccess).mockResolvedValue(adminAccess)
    const response = await DELETE(
      request('/api/tech-admin/customer-portal-domains/domain-1', 'DELETE'),
      context,
    )
    expect(response.status).toBe(204)
    expect(deleteTechAdminPortalDomain).toHaveBeenCalledWith('domain-1')
  })

  it('returns not found when the association no longer exists', async () => {
    vi.mocked(deleteTechAdminPortalDomain).mockResolvedValue(false)

    const response = await DELETE(
      request('/api/tech-admin/customer-portal-domains/missing', 'DELETE'),
      { params: Promise.resolve({ id: 'missing' }) },
    )
    expect(response.status).toBe(404)
  })
})

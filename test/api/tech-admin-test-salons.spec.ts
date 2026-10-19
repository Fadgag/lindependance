import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getAccess: vi.fn(),
  provisionTestSalon: vi.fn(),
}))

vi.mock('@/lib/testCampaignAccess', () => ({
  getTestCampaignAdminAccess: mocks.getAccess,
}))
vi.mock('@/services/testSalonProvisioning.service', () => ({
  provisionTestSalon: mocks.provisionTestSalon,
}))

import { POST } from '@/app/api/tech-admin/test-salons/route'
import { getTestCampaignAdminAccess } from '@/lib/testCampaignAccess'
import { provisionTestSalon } from '@/services/testSalonProvisioning.service'

const salon = {
  id: 'org-test',
  name: 'Salon de test salon-test-fixture',
  slug: 'salon-test-fixture',
  customerEmail: 'client-salon-test-fixture@example.invalid',
}

function post(body: string) {
  return new Request('https://example.test/api/tech-admin/test-salons', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('VERCEL_ENV', 'preview')
  vi.stubEnv('VERCEL_GIT_COMMIT_REF', 'preprod')
  vi.mocked(getTestCampaignAdminAccess).mockResolvedValue({
    authorized: true,
    session: {
      expires: '2026-10-07T12:00:00.000Z',
      user: {
        id: 'technical-admin',
        name: 'Technical Admin',
        email: 'admin@example.test',
        image: null,
        role: 'TECH_ADMIN',
        accountType: 'STAFF',
      },
    },
  })
  vi.mocked(provisionTestSalon).mockResolvedValue(salon)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('POST /api/tech-admin/test-salons', () => {
  it('refuses provisioning outside the exact preprod preview before checking access', async () => {
    vi.stubEnv('VERCEL_GIT_COMMIT_REF', 'feature/other')

    const response = await POST(post('{}'))

    expect(response.status).toBe(404)
    expect(getTestCampaignAdminAccess).not.toHaveBeenCalled()
    expect(provisionTestSalon).not.toHaveBeenCalled()
  })

  it('requires TECH_ADMIN authorization on the server', async () => {
    vi.mocked(getTestCampaignAdminAccess).mockResolvedValue({
      authorized: false,
      status: 403,
    })

    const response = await POST(post('{}'))

    expect(response.status).toBe(403)
    expect(provisionTestSalon).not.toHaveBeenCalled()
  })

  it('rejects invalid JSON and unexpected fields', async () => {
    expect((await POST(post('{'))).status).toBe(400)
    expect((await POST(post('{"name":"Salon réel"}'))).status).toBe(400)
    expect(provisionTestSalon).not.toHaveBeenCalled()
  })

  it('returns the created salon and its portal identifier without sending invitations', async () => {
    const response = await POST(post('{}'))

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual(salon)
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    expect(provisionTestSalon).toHaveBeenCalledOnce()
  })
})

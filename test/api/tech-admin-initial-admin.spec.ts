import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getAccess: vi.fn(),
  createInitialAdmin: vi.fn(),
  sendActivationEmail: vi.fn(),
}))

vi.mock('@/lib/testCampaignAccess', () => ({
  getTestCampaignAdminAccess: mocks.getAccess,
}))
vi.mock('@/services/userAccounts.service', () => ({
  createInitialOrganizationAdmin: mocks.createInitialAdmin,
}))
vi.mock('@/services/staffActivationEmail.service', () => ({
  sendStaffActivationEmail: mocks.sendActivationEmail,
}))

import { POST } from '@/app/api/tech-admin/organizations/[organizationId]/admin/route'
import { getTestCampaignAdminAccess } from '@/lib/testCampaignAccess'
import { createInitialOrganizationAdmin } from '@/services/userAccounts.service'

function post(body: unknown) {
  return new Request('https://example.test/api/tech-admin/organizations/org-1/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const context = { params: Promise.resolve({ organizationId: 'org-1' }) }

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('VERCEL_ENV', 'preview')
  vi.stubEnv('VERCEL_GIT_COMMIT_REF', 'preprod')
  vi.mocked(getTestCampaignAdminAccess).mockResolvedValue({
    authorized: true,
    session: {
      expires: '2026-10-23T12:00:00.000Z',
      user: {
        id: 'technical-admin',
        name: 'Technical Admin',
        email: 'tech@example.test',
        image: null,
        role: 'TECH_ADMIN',
        accountType: 'STAFF',
      },
    },
  })
  vi.mocked(createInitialOrganizationAdmin).mockResolvedValue({
    kind: 'created',
    organizationName: 'Salon A',
    account: {
      id: 'admin-1',
      email: 'admin@example.test',
      name: null,
      role: 'ADMIN',
    },
  })
  vi.mocked(mocks.sendActivationEmail).mockResolvedValue({ sent: true, error: null })
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('POST /api/tech-admin/organizations/[organizationId]/admin', () => {
  it('requires a preprod preview and TECH_ADMIN authorization', async () => {
    vi.stubEnv('VERCEL_GIT_COMMIT_REF', 'feature/other')
    expect((await POST(post({
      email: 'admin@example.test',
      confirmControlledEmail: true,
    }), context)).status).toBe(404)
    expect(getTestCampaignAdminAccess).not.toHaveBeenCalled()

    vi.stubEnv('VERCEL_GIT_COMMIT_REF', 'preprod')
    vi.mocked(getTestCampaignAdminAccess).mockResolvedValueOnce({
      authorized: false,
      status: 403,
    })
    expect((await POST(post({
      email: 'admin@example.test',
      confirmControlledEmail: true,
    }), context)).status).toBe(403)
    expect(createInitialOrganizationAdmin).not.toHaveBeenCalled()
  })

  it('rejects unchecked or caller-supplied roles and organizations', async () => {
    for (const body of [
      { email: 'admin@example.test' },
      { email: 'admin@example.test', confirmControlledEmail: true, role: 'TECH_ADMIN' },
      { email: 'admin@example.test', confirmControlledEmail: true, organizationId: 'org-2' },
    ]) {
      expect((await POST(post(body), context)).status).toBe(400)
    }
    expect(createInitialOrganizationAdmin).not.toHaveBeenCalled()
    expect(mocks.sendActivationEmail).not.toHaveBeenCalled()
  })

  it('creates only the first ADMIN and sends a one-time activation without returning secrets', async () => {
    const response = await POST(post({
      email: ' Admin@Example.Test ',
      confirmControlledEmail: true,
    }), context)

    expect(response.status).toBe(201)
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    const body = await response.json()
    expect(body).toEqual({
      organization: { id: 'org-1', name: 'Salon A' },
      account: { id: 'admin-1', email: 'admin@example.test', role: 'ADMIN' },
      invitation: { sent: true, error: null },
    })
    expect(JSON.stringify(body)).not.toMatch(/password|token/i)
    expect(createInitialOrganizationAdmin).toHaveBeenCalledWith({
      actorId: 'technical-admin',
      organizationId: 'org-1',
      email: 'admin@example.test',
    })
    expect(mocks.sendActivationEmail).toHaveBeenCalledWith({
      email: 'admin@example.test',
      organizationName: 'Salon A',
    })
  })

  it('reports an existing ADMIN or duplicate email and does not invite', async () => {
    vi.mocked(createInitialOrganizationAdmin).mockResolvedValueOnce({ kind: 'admin_exists' })
    expect((await POST(post({
      email: 'admin@example.test',
      confirmControlledEmail: true,
    }), context)).status).toBe(409)

    vi.mocked(createInitialOrganizationAdmin).mockResolvedValueOnce({ kind: 'email_exists' })
    expect((await POST(post({
      email: 'admin@example.test',
      confirmControlledEmail: true,
    }), context)).status).toBe(409)
    expect(mocks.sendActivationEmail).not.toHaveBeenCalled()
  })
})

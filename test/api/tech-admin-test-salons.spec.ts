import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getAccess: vi.fn(),
  provisionTestSalon: vi.fn(),
  sendActivationEmail: vi.fn(),
}))

vi.mock('@/lib/testCampaignAccess', () => ({
  getTestCampaignAdminAccess: mocks.getAccess,
}))
vi.mock('@/services/testSalonProvisioning.service', () => ({
  provisionTestSalon: mocks.provisionTestSalon,
}))
vi.mock('@/services/staffActivationEmail.service', () => ({
  sendStaffActivationEmail: mocks.sendActivationEmail,
}))

import { POST } from '@/app/api/tech-admin/test-salons/route'
import { getTestCampaignAdminAccess } from '@/lib/testCampaignAccess'
import { provisionTestSalon } from '@/services/testSalonProvisioning.service'

const salon: {
  id: string
  name: string
  slug: string
  customerEmail: string
  staffAccount: { email: string; role: 'USER' | 'ADMIN' }
} = {
  id: 'org-test',
  name: 'Salon de test salon-test-fixture',
  slug: 'salon-test-fixture',
  customerEmail: 'client-salon-test-fixture@example.invalid',
  staffAccount: {
    email: 'staff@example.test',
    role: 'USER',
  },
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
  vi.mocked(provisionTestSalon).mockResolvedValue({ kind: 'created', salon })
  vi.mocked(mocks.sendActivationEmail).mockResolvedValue({ sent: true, error: null })
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
    expect(mocks.sendActivationEmail).not.toHaveBeenCalled()
  })

  it('requires TECH_ADMIN authorization on the server', async () => {
    vi.mocked(getTestCampaignAdminAccess).mockResolvedValue({
      authorized: false,
      status: 403,
    })

    const response = await POST(post('{}'))

    expect(response.status).toBe(403)
    expect(provisionTestSalon).not.toHaveBeenCalled()
    expect(mocks.sendActivationEmail).not.toHaveBeenCalled()
  })

  it('rejects invalid JSON and invalid or unconfirmed account details', async () => {
    expect((await POST(post('{'))).status).toBe(400)
    expect((await POST(post('{"email":"staff@example.test"}'))).status).toBe(400)
    expect((await POST(post(JSON.stringify({
      email: 'staff@example.test',
      role: 'TECH_ADMIN',
      confirmControlledEmail: true,
    })))).status).toBe(400)
    expect((await POST(post(JSON.stringify({
      email: 'staff@example.test',
      confirmControlledEmail: true,
      organizationId: 'other-org',
    })))).status).toBe(400)
    expect(provisionTestSalon).not.toHaveBeenCalled()
    expect(mocks.sendActivationEmail).not.toHaveBeenCalled()
  })

  it('provisions a USER account and sends activation only after explicit confirmation', async () => {
    const response = await POST(post(JSON.stringify({
      email: ' Staff@Example.Test ',
      confirmControlledEmail: true,
    })))

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({
      ...salon,
      invitation: { sent: true, error: null },
    })
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    expect(provisionTestSalon).toHaveBeenCalledWith({
      email: 'staff@example.test',
      role: 'USER',
    })
    expect(mocks.sendActivationEmail).toHaveBeenCalledWith({
      email: 'staff@example.test',
      organizationName: salon.name,
    })
  })

  it('surfaces invitation failure while preserving the provisioned salon result', async () => {
    vi.mocked(mocks.sendActivationEmail).mockResolvedValue({
      sent: false,
      error: 'Le compte est créé, mais l’envoi de l’e-mail d’activation a échoué ou n’a pas pu être confirmé.',
    })
    vi.mocked(provisionTestSalon).mockResolvedValue({
      kind: 'created',
      salon: {
        ...salon,
        staffAccount: { email: 'staff@example.test', role: 'ADMIN' },
      },
    })

    const response = await POST(post(JSON.stringify({
      email: 'staff@example.test',
      role: 'ADMIN',
      confirmControlledEmail: true,
    })))

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({
      ...salon,
      staffAccount: { email: 'staff@example.test', role: 'ADMIN' },
      invitation: {
        sent: false,
        error: 'Le compte est créé, mais l’envoi de l’e-mail d’activation a échoué ou n’a pas pu être confirmé.',
      },
    })
    expect(provisionTestSalon).toHaveBeenCalledWith({
      email: 'staff@example.test',
      role: 'ADMIN',
    })
  })

  it('reports a duplicate account address without sending activation', async () => {
    vi.mocked(provisionTestSalon).mockResolvedValueOnce({ kind: 'email_exists' })

    const response = await POST(post(JSON.stringify({
      email: 'staff@example.test',
      confirmControlledEmail: true,
    })))

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({
      error: 'Cette adresse e-mail est déjà associée à un compte.',
    })
    expect(mocks.sendActivationEmail).not.toHaveBeenCalled()
  })
})

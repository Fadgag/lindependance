import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getAdminAccess: vi.fn(),
  listCampaigns: vi.fn(),
  createCampaign: vi.fn(),
  getPublicCampaign: vi.fn(),
  loadScenarioCatalog: vi.fn(),
  createFeedback: vi.fn(),
  consumeRateLimits: vi.fn(),
  getSecret: vi.fn(),
  hashRateLimitKey: vi.fn(),
}))

vi.mock('@/lib/testCampaignAccess', () => ({ getTestCampaignAdminAccess: mocks.getAdminAccess }))
vi.mock('@/services/testFeedback.service', () => ({
  listTestCampaigns: mocks.listCampaigns,
  createTestCampaign: mocks.createCampaign,
  getPublicTestCampaign: mocks.getPublicCampaign,
  loadScenarioCatalog: mocks.loadScenarioCatalog,
  createTestFeedback: mocks.createFeedback,
}))
vi.mock('@/services/customerPortal.service', () => ({ consumePortalRateLimits: mocks.consumeRateLimits }))
vi.mock('@/lib/customerPortalSecurity', () => ({
  getCustomerPortalSecret: mocks.getSecret,
  hashRateLimitKey: mocks.hashRateLimitKey,
}))

import { GET as getCampaigns, POST as postCampaign } from '@/app/api/test-campaigns/route'
import { GET as getPublicFeedback, POST as postPublicFeedback } from '@/app/api/test-feedback/[campaignToken]/route'
import { getTestCampaignAdminAccess } from '@/lib/testCampaignAccess'
import {
  createTestCampaign,
  createTestFeedback,
  getPublicTestCampaign,
  listTestCampaigns,
  loadScenarioCatalog,
} from '@/services/testFeedback.service'
import { consumePortalRateLimits } from '@/services/customerPortal.service'
import { getCustomerPortalSecret, hashRateLimitKey } from '@/lib/customerPortalSecurity'

const campaignToken = 'a'.repeat(43)
const scenarioCatalog = {
  ADMIN: [{
    id: 'ADM-01',
    profile: 'ADMIN' as const,
    title: 'Accès staff',
    priority: 'P0' as const,
    steps: 'Ouvrir la page.',
    expected: 'La page est accessible.',
  }],
  USER: [{
    id: 'CUS-01',
    profile: 'USER' as const,
    title: 'Réserver',
    priority: 'P1' as const,
    steps: 'Choisir une prestation.',
    expected: 'La réservation est enregistrée.',
  }],
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(getTestCampaignAdminAccess).mockResolvedValue({
    authorized: true,
    session: { user: { role: 'TECH_ADMIN', accountType: 'STAFF' } },
  } as never)
  vi.mocked(getPublicTestCampaign).mockResolvedValue({
    name: 'Recette bêta',
    build: 'abc123',
    status: 'ACTIVE',
    profiles: ['USER'],
    organization: { name: 'Osez le T’re' },
  } as never)
  vi.mocked(loadScenarioCatalog).mockReturnValue(scenarioCatalog)
  vi.mocked(consumePortalRateLimits).mockResolvedValue(true)
  vi.mocked(getCustomerPortalSecret).mockReturnValue('test-secret')
  vi.mocked(hashRateLimitKey).mockReturnValue('hashed-campaign-token')
  vi.mocked(createTestFeedback).mockResolvedValue(true)
})

describe('test campaign management API', () => {
  it('denies salon administrators from the global dashboard API', async () => {
    vi.mocked(getTestCampaignAdminAccess).mockResolvedValue({ authorized: false, status: 403 })

    const response = await getCampaigns()

    expect(response.status).toBe(403)
    expect(listTestCampaigns).not.toHaveBeenCalled()
  })

  it('validates and creates a campaign for the selected organization', async () => {
    vi.mocked(createTestCampaign).mockResolvedValue({ id: 'campaign-id' } as never)

    const response = await postCampaign(new Request('https://example.test/api/test-campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Recette bêta',
        organizationId: 'org-id',
        build: 'abc123',
        profiles: ['USER'],
      }),
    }))

    expect(response.status).toBe(201)
    expect(createTestCampaign).toHaveBeenCalledWith({
      name: 'Recette bêta',
      organizationId: 'org-id',
      build: 'abc123',
      profiles: ['USER'],
    })
  })
})

describe('public test feedback API', () => {
  const context = { params: Promise.resolve({ campaignToken }) }

  it('returns checklist metadata without exposing database identifiers or the bearer token', async () => {
    const response = await getPublicFeedback(
      new Request(`https://example.test/api/test-feedback/${campaignToken}?profile=USER`),
      context,
    )
    const body: unknown = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      name: 'Recette bêta',
      build: 'abc123',
      status: 'ACTIVE',
      organizationName: 'Osez le T’re',
      profiles: ['USER'],
      scenarios: scenarioCatalog.USER,
    })
  })

  it('rejects unknown scenarios and stores authoritative guide data for valid results', async () => {
    const invalid = await postPublicFeedback(new Request(
      `https://example.test/api/test-feedback/${campaignToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: 'USER',
          results: [{ scenarioId: 'ADM-01', status: 'PASS' }],
        }),
      },
    ), context)
    expect(invalid.status).toBe(400)
    expect(createTestFeedback).not.toHaveBeenCalled()

    const response = await postPublicFeedback(new Request(
      `https://example.test/api/test-feedback/${campaignToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: 'USER',
          environment: 'Firefox',
          results: [{ scenarioId: 'CUS-01', status: 'FAIL', comment: 'Le bouton ne répond pas.' }],
        }),
      },
    ), context)

    expect(response.status).toBe(201)
    expect(createTestFeedback).toHaveBeenCalledWith({
      publicToken: campaignToken,
      profile: 'USER',
      environment: 'Firefox',
      results: [{
        scenarioId: 'CUS-01',
        scenarioTitle: 'Réserver',
        scenarioPriority: 'P1',
        status: 'FAIL',
        comment: 'Le bouton ne répond pas.',
      }],
    })
    expect(consumePortalRateLimits).toHaveBeenCalledWith([expect.objectContaining({
      scope: 'test-feedback-campaign-submission',
      keyHash: 'hashed-campaign-token',
    })])
  })

  it('requires a comment for failures and blocks submissions after campaign closure', async () => {
    const missingComment = await postPublicFeedback(new Request(
      `https://example.test/api/test-feedback/${campaignToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: 'USER',
          results: [{ scenarioId: 'CUS-01', status: 'FAIL' }],
        }),
      },
    ), context)
    expect(missingComment.status).toBe(400)

    vi.mocked(getPublicTestCampaign).mockResolvedValueOnce({
      name: 'Recette bêta',
      build: 'abc123',
      status: 'CLOSED',
      profiles: ['USER'],
      organization: { name: 'Osez le T’re' },
    } as never)
    const closed = await postPublicFeedback(new Request(
      `https://example.test/api/test-feedback/${campaignToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: 'USER',
          results: [{ scenarioId: 'CUS-01', status: 'PASS' }],
        }),
      },
    ), context)
    expect(closed.status).toBe(410)
    expect(createTestFeedback).not.toHaveBeenCalled()
  })
})

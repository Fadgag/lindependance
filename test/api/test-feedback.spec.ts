import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getAdminAccess: vi.fn(),
  listCampaigns: vi.fn(),
  listCampaignRecipients: vi.fn(),
  createCampaign: vi.fn(),
  sendCampaignInvitations: vi.fn(),
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
  listTestCampaignRecipients: mocks.listCampaignRecipients,
  createTestCampaign: mocks.createCampaign,
  getPublicTestCampaign: mocks.getPublicCampaign,
  loadScenarioCatalog: mocks.loadScenarioCatalog,
  createTestFeedback: mocks.createFeedback,
}))
vi.mock('@/services/testCampaignInvitationEmail.service', () => ({
  sendTestCampaignInvitationEmails: mocks.sendCampaignInvitations,
}))
vi.mock('@/services/customerPortal.service', () => ({ consumePortalRateLimits: mocks.consumeRateLimits }))
vi.mock('@/lib/customerPortalSecurity', () => ({
  getCustomerPortalSecret: mocks.getSecret,
  hashRateLimitKey: mocks.hashRateLimitKey,
}))

import { GET as getCampaigns, POST as postCampaign } from '@/app/api/test-campaigns/route'
import { GET as getCampaignRecipients } from '@/app/api/test-campaigns/recipients/route'
import { GET as getPublicFeedback, POST as postPublicFeedback } from '@/app/api/test-feedback/[campaignToken]/route'
import { getTestCampaignAdminAccess } from '@/lib/testCampaignAccess'
import {
  createTestCampaign,
  listTestCampaignRecipients,
  createTestFeedback,
  getPublicTestCampaign,
  listTestCampaigns,
  loadScenarioCatalog,
} from '@/services/testFeedback.service'
import { consumePortalRateLimits } from '@/services/customerPortal.service'
import { getCustomerPortalSecret, hashRateLimitKey } from '@/lib/customerPortalSecurity'
import { sendTestCampaignInvitationEmails } from '@/services/testCampaignInvitationEmail.service'

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
  }, {
    id: 'CUS-11',
    profile: 'USER' as const,
    title: 'Mes rendez-vous',
    priority: 'P1' as const,
    steps: 'Ouvrir les rendez-vous.',
    expected: 'Les prochains rendez-vous apparaissent.',
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
    status: 'ACTIVE',
    profiles: ['USER'],
    scenarioGroups: ['ONLINE_BOOKING'],
    organization: { name: 'Osez le T’re', slug: 'osez-le-tre', portalEnabled: true },
  } as never)
  vi.mocked(listTestCampaignRecipients).mockResolvedValue([])
  vi.mocked(sendTestCampaignInvitationEmails).mockResolvedValue({ failedIndexes: [], error: null })
  vi.mocked(loadScenarioCatalog).mockReturnValue(scenarioCatalog)
  vi.mocked(consumePortalRateLimits).mockResolvedValue(true)
  vi.mocked(getCustomerPortalSecret).mockReturnValue('test-secret')
  vi.mocked(hashRateLimitKey).mockReturnValue('hashed-campaign-token')
  vi.mocked(createTestFeedback).mockResolvedValue(true)
})

describe('test campaign management API', () => {
  it('returns recipients for the requested organization only to a technical admin', async () => {
    vi.mocked(listTestCampaignRecipients).mockResolvedValue([{
      id: 'user-1',
      name: 'Camille',
      email: 'camille@example.test',
      source: 'USER',
      role: 'USER',
    }, {
      id: 'customer-1',
      name: 'Léa Martin',
      email: 'lea@example.test',
      source: 'CUSTOMER',
    }])

    const response = await getCampaignRecipients(new Request(
      'https://example.test/api/test-campaigns/recipients?organizationId=org-id',
    ))

    expect(response.status).toBe(200)
    expect(listTestCampaignRecipients).toHaveBeenCalledWith('org-id')
    expect(await response.json()).toEqual([{
      id: 'user-1',
      name: 'Camille',
      email: 'camille@example.test',
      source: 'USER',
      role: 'USER',
    }, {
      id: 'customer-1',
      name: 'Léa Martin',
      email: 'lea@example.test',
      source: 'CUSTOMER',
    }])
  })

  it('does not return recipients when the caller is not a technical admin', async () => {
    vi.mocked(getTestCampaignAdminAccess).mockResolvedValue({ authorized: false, status: 403 })

    const response = await getCampaignRecipients(new Request(
      'https://example.test/api/test-campaigns/recipients?organizationId=org-id',
    ))

    expect(response.status).toBe(403)
    expect(listTestCampaignRecipients).not.toHaveBeenCalled()
  })

  it('denies salon administrators from the global dashboard API', async () => {
    vi.mocked(getTestCampaignAdminAccess).mockResolvedValue({ authorized: false, status: 403 })

    const response = await getCampaigns()

    expect(response.status).toBe(403)
    expect(listTestCampaigns).not.toHaveBeenCalled()
  })

  it('validates and creates a campaign for the selected organization', async () => {
    vi.mocked(createTestCampaign).mockResolvedValue({
      id: 'campaign-id',
      name: 'Recette bêta',
      publicToken: campaignToken,
      organizationName: 'Osez le T’re',
    } as never)

    const response = await postCampaign(new Request('https://example.test/api/test-campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Recette bêta',
        organizationId: 'org-id',
        profiles: ['USER'],
        scenarioGroups: ['ONLINE_BOOKING'],
      }),
    }))

    expect(response.status).toBe(201)
    expect(createTestCampaign).toHaveBeenCalledWith({
      name: 'Recette bêta',
      organizationId: 'org-id',
      profiles: ['USER'],
      scenarioGroups: ['ONLINE_BOOKING'],
    })
    expect(listTestCampaignRecipients).not.toHaveBeenCalled()
    expect(await response.json()).toMatchObject({
      id: 'campaign-id',
      invitations: { sent: 0, failedRecipients: [], deliveryError: null },
    })
  })

  it('sends the public campaign link to a selected customer without storing recipient IDs', async () => {
    vi.mocked(createTestCampaign).mockResolvedValue({
      id: 'campaign-id',
      name: 'Recette bêta',
      publicToken: campaignToken,
      organizationName: 'Osez le T’re',
    } as never)
    vi.mocked(listTestCampaignRecipients).mockResolvedValue([{
      id: 'customer-1',
      name: 'Léa Martin',
      email: 'lea@example.test',
      source: 'CUSTOMER',
    }])

    const response = await postCampaign(new Request('https://example.test/api/test-campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Recette bêta',
        organizationId: 'org-id',
        profiles: ['USER'],
        scenarioGroups: ['ONLINE_BOOKING'],
        recipientIds: [{ source: 'CUSTOMER', id: 'customer-1' }],
        emailSubject: 'Testez la réservation',
        emailMessage: 'Merci de vérifier le parcours de réservation.',
      }),
    }))

    expect(response.status).toBe(201)
    expect(createTestCampaign).toHaveBeenCalledWith({
      name: 'Recette bêta',
      organizationId: 'org-id',
      profiles: ['USER'],
      scenarioGroups: ['ONLINE_BOOKING'],
    })
    expect(listTestCampaignRecipients).toHaveBeenCalledWith('org-id', [
      { source: 'CUSTOMER', id: 'customer-1' },
    ])
    expect(sendTestCampaignInvitationEmails).toHaveBeenCalledWith({
      recipients: [{ to: 'lea@example.test', recipientName: 'Léa Martin' }],
      campaignName: 'Recette bêta',
      organizationName: expect.any(String),
      campaignUrl: `https://example.test/retour-test/${campaignToken}`,
      subject: 'Testez la réservation',
      message: 'Merci de vérifier le parcours de réservation.',
    })
    expect(await response.json()).toMatchObject({
      id: 'campaign-id',
      invitations: { sent: 1, failedRecipients: [], deliveryError: null },
    })
  })

  it('rejects recipient IDs outside the selected organization before creating a campaign', async () => {
    vi.mocked(listTestCampaignRecipients).mockResolvedValue([])

    const response = await postCampaign(new Request('https://example.test/api/test-campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Recette bêta',
        organizationId: 'org-id',
        profiles: ['USER'],
        scenarioGroups: ['ONLINE_BOOKING'],
        recipientIds: [{ source: 'CUSTOMER', id: 'foreign-customer' }],
      }),
    }))

    expect(response.status).toBe(400)
    expect(createTestCampaign).not.toHaveBeenCalled()
    expect(sendTestCampaignInvitationEmails).not.toHaveBeenCalled()
  })

  it('rejects more than 50 invitation recipients', async () => {
    const response = await postCampaign(new Request('https://example.test/api/test-campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Recette bêta',
        organizationId: 'org-id',
        profiles: ['USER'],
        scenarioGroups: ['ONLINE_BOOKING'],
        recipientIds: Array.from({ length: 51 }, (_, index) => ({
          source: 'CUSTOMER',
          id: `customer-${index}`,
        })),
      }),
    }))

    expect(response.status).toBe(400)
    expect(listTestCampaignRecipients).not.toHaveBeenCalled()
    expect(createTestCampaign).not.toHaveBeenCalled()
  })

  it('rejects line breaks in a custom email subject', async () => {
    const response = await postCampaign(new Request('https://example.test/api/test-campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Recette bêta',
        organizationId: 'org-id',
        profiles: ['USER'],
        scenarioGroups: ['ONLINE_BOOKING'],
        emailSubject: 'Recette bêta\nBcc: outsider@example.test',
      }),
    }))

    expect(response.status).toBe(400)
    expect(createTestCampaign).not.toHaveBeenCalled()
  })

  it('keeps the campaign and reports recipients when an invitation email fails', async () => {
    vi.mocked(createTestCampaign).mockResolvedValue({
      id: 'campaign-id',
      name: 'Recette bêta',
      publicToken: campaignToken,
      organizationName: 'Osez le T’re',
    } as never)
    vi.mocked(listTestCampaignRecipients).mockResolvedValue([{
      id: 'user-1',
      name: 'Camille',
      email: 'camille@example.test',
      source: 'USER',
      role: 'USER',
    }])
    vi.mocked(sendTestCampaignInvitationEmails).mockResolvedValue({
      failedIndexes: [0],
      error: 'Resend unavailable',
    })

    const response = await postCampaign(new Request('https://example.test/api/test-campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Recette bêta',
        organizationId: 'org-id',
        profiles: ['USER'],
        scenarioGroups: ['ONLINE_BOOKING'],
        recipientIds: [{ source: 'USER', id: 'user-1' }],
      }),
    }))

    expect(response.status).toBe(201)
    expect(await response.json()).toMatchObject({
      invitations: {
        sent: 0,
        failedRecipients: ['Camille'],
        deliveryError: 'Resend unavailable',
      },
    })
  })

  it('rejects a campaign when a selected profile has no matching scenario group', async () => {
    const response = await postCampaign(new Request('https://example.test/api/test-campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Campagne incohérente',
        organizationId: 'org-id',
        profiles: ['USER'],
        scenarioGroups: ['STAFF_ADMINISTRATION'],
      }),
    }))

    expect(response.status).toBe(400)
    expect(createTestCampaign).not.toHaveBeenCalled()
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
      status: 'ACTIVE',
      organizationName: 'Osez le T’re',
      organizationSlug: 'osez-le-tre',
      organizationPortalEnabled: true,
      profiles: ['USER'],
      scenarioGroups: ['ONLINE_BOOKING'],
      scenarios: [scenarioCatalog.USER[0]],
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
          results: [{ scenarioId: 'CUS-11', status: 'PASS' }],
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
          campaignReview: {
            clarity: 'MOSTLY_CLEAR',
            duration: 'ABOUT_RIGHT',
            links: 'VERY_USEFUL',
            satisfaction: 'SATISFIED',
            comment: 'Les liens directs m’ont aidé à suivre les étapes.',
          },
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
      campaignReview: {
        clarity: 'MOSTLY_CLEAR',
        duration: 'ABOUT_RIGHT',
        links: 'VERY_USEFUL',
        satisfaction: 'SATISFIED',
        comment: 'Les liens directs m’ont aidé à suivre les étapes.',
      },
    })
    expect(consumePortalRateLimits).toHaveBeenCalledWith([expect.objectContaining({
      scope: 'test-feedback-campaign-submission',
      keyHash: 'hashed-campaign-token',
    })])
  })

  it('rejects unsupported campaign review answers', async () => {
    const response = await postPublicFeedback(new Request(
      `https://example.test/api/test-feedback/${campaignToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: 'USER',
          results: [{ scenarioId: 'CUS-01', status: 'PASS' }],
          campaignReview: { clarity: 'CONFUSING_BUT_ALSO_CLEAR' },
        }),
      },
    ), context)

    expect(response.status).toBe(400)
    expect(createTestFeedback).not.toHaveBeenCalled()
  })

  it('does not accept campaign feedback without at least one checked scenario', async () => {
    const response = await postPublicFeedback(new Request(
      `https://example.test/api/test-feedback/${campaignToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: 'USER',
          results: [],
          campaignReview: { comment: 'Les consignes étaient utiles.' },
        }),
      },
    ), context)

    expect(response.status).toBe(400)
    expect(createTestFeedback).not.toHaveBeenCalled()
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
      status: 'CLOSED',
      profiles: ['USER'],
      scenarioGroups: ['ONLINE_BOOKING'],
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

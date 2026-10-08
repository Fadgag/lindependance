import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const transactionClient = {
    testCampaign: { findUnique: vi.fn() },
    testFeedback: { createMany: vi.fn() },
    testCampaignReview: { create: vi.fn() },
  }
  return {
    organizationFindMany: vi.fn(),
    organizationFindUnique: vi.fn(),
    campaignFindMany: vi.fn(),
    userFindMany: vi.fn(),
    customerFindMany: vi.fn(),
    campaignCreate: vi.fn(),
    campaignFindUnique: vi.fn(),
    campaignUpdateMany: vi.fn(),
    feedbackCreateMany: vi.fn(),
    transactionClient,
    transaction: vi.fn(async (operation: (client: typeof transactionClient) => Promise<unknown>) => operation(transactionClient)),
  }
})

vi.mock('@/lib/prisma', () => ({
  prisma: {
    organization: {
      findMany: mocks.organizationFindMany,
      findUnique: mocks.organizationFindUnique,
    },
    user: { findMany: mocks.userFindMany },
    customer: { findMany: mocks.customerFindMany },
    testCampaign: {
      create: mocks.campaignCreate,
      findMany: mocks.campaignFindMany,
      findUnique: mocks.campaignFindUnique,
      updateMany: mocks.campaignUpdateMany,
    },
    testFeedback: { createMany: mocks.feedbackCreateMany },
    $transaction: mocks.transaction,
  },
}))

import {
  createTestCampaign,
  createTestFeedback,
  closeTestCampaign,
  listTestCampaigns,
  getTestCampaignDetail,
  getPublicTestCampaign,
  listTestCampaignRecipients,
} from '@/services/testFeedback.service'

beforeEach(() => {
  vi.resetAllMocks()
  mocks.organizationFindUnique.mockResolvedValue({ id: 'org-1', name: 'Osez le T’re' })
  mocks.organizationFindMany.mockResolvedValue([{ id: 'org-1', name: 'Osez le T’re' }])
  mocks.campaignFindMany.mockResolvedValue([])
  mocks.userFindMany.mockResolvedValue([])
  mocks.customerFindMany.mockResolvedValue([])
  mocks.campaignCreate.mockResolvedValue({ id: 'campaign-1' })
  mocks.transactionClient.testCampaign.findUnique.mockResolvedValue({
    id: 'campaign-1',
    organizationId: 'org-1',
    status: 'ACTIVE',
    profiles: ['USER'],
    scenarioGroups: ['ONLINE_BOOKING'],
  })
  mocks.transactionClient.testFeedback.createMany.mockResolvedValue({ count: 1 })
  mocks.campaignUpdateMany.mockResolvedValue({ count: 1 })
})

describe('test feedback service', () => {
  it('limits campaign dashboard records to the selected organizations', async () => {
    await listTestCampaigns(['org-2', 'org-3'])

    expect(mocks.campaignFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { organizationId: { in: ['org-2', 'org-3'] } },
    }))
    expect(mocks.organizationFindMany).toHaveBeenCalledWith({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    })
  })

  it('includes the organization slug in public campaign metadata without exposing its ID', async () => {
    mocks.campaignFindUnique.mockResolvedValueOnce({
      name: 'Recette bêta',
      status: 'ACTIVE',
      profiles: ['USER'],
      scenarioGroups: ['ONLINE_BOOKING'],
      organization: { name: 'Osez le T’re', slug: 'osez-le-tre', portalEnabled: true },
    })

    await expect(getPublicTestCampaign('public-token')).resolves.toEqual({
      name: 'Recette bêta',
      status: 'ACTIVE',
      profiles: ['USER'],
      scenarioGroups: ['ONLINE_BOOKING'],
      organization: { name: 'Osez le T’re', slug: 'osez-le-tre', portalEnabled: true },
    })
    expect(mocks.campaignFindUnique).toHaveBeenCalledWith({
      where: { publicToken: 'public-token' },
      select: {
        name: true,
        status: true,
        profiles: true,
        scenarioGroups: true,
        organization: { select: { name: true, slug: true, portalEnabled: true } },
      },
    })
  })

  it('lists email-enabled accounts and clients for the selected organization and deduplicates addresses', async () => {
    mocks.userFindMany.mockResolvedValue([{
      id: 'user-1',
      name: 'Camille',
      email: 'camille@example.test',
      role: 'USER',
    }])
    mocks.customerFindMany.mockResolvedValue([
      {
        id: 'customer-duplicate',
        firstName: 'Camille',
        lastName: 'Martin',
        email: 'CAMILLE@example.test',
      },
      {
        id: 'customer-1',
        firstName: 'Léa',
        lastName: 'Durand',
        email: 'lea@example.test',
      },
      {
        id: 'customer-no-email',
        firstName: 'No',
        lastName: 'Email',
        email: ' ',
      },
      {
        id: 'customer-invalid-email',
        firstName: 'Invalid',
        lastName: 'Email',
        email: 'not-an-email',
      },
    ])

    const recipients = await listTestCampaignRecipients('org-1')

    expect(recipients).toEqual([{
      id: 'user-1',
      name: 'Camille',
      email: 'camille@example.test',
      source: 'USER',
      role: 'USER',
    }, {
      id: 'customer-1',
      name: 'Léa Durand',
      email: 'lea@example.test',
      source: 'CUSTOMER',
    }])
    expect(mocks.userFindMany).toHaveBeenCalledWith({
      where: {
        organizationId: 'org-1',
        email: { not: null },
        role: { in: ['ADMIN', 'USER'] },
      },
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
      select: { id: true, name: true, email: true, role: true },
    })
    expect(mocks.customerFindMany).toHaveBeenCalledWith({
      where: {
        organizationId: 'org-1',
        email: { not: null },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }, { email: 'asc' }],
      select: { id: true, firstName: true, lastName: true, email: true },
    })

    await listTestCampaignRecipients('org-1', [
      { source: 'USER', id: 'user-1' },
      { source: 'CUSTOMER', id: 'customer-1' },
    ])
    expect(mocks.userFindMany).toHaveBeenLastCalledWith({
      where: {
        organizationId: 'org-1',
        email: { not: null },
        role: { in: ['ADMIN', 'USER'] },
        id: { in: ['user-1'] },
      },
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
      select: { id: true, name: true, email: true, role: true },
    })
    expect(mocks.customerFindMany).toHaveBeenLastCalledWith({
      where: {
        organizationId: 'org-1',
        email: { not: null },
        id: { in: ['customer-1'] },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }, { email: 'asc' }],
      select: { id: true, firstName: true, lastName: true, email: true },
    })
  })

  it('creates campaigns only for existing organizations with an opaque random token', async () => {
    await createTestCampaign({
      name: 'Recette bêta',
      organizationId: 'org-1',
      profiles: ['USER'],
      scenarioGroups: ['ONLINE_BOOKING'],
    })

    const [createInput] = mocks.campaignCreate.mock.calls[0]
    expect(createInput.data).toMatchObject({
      name: 'Recette bêta',
      build: null,
      organizationId: 'org-1',
      profiles: ['USER'],
      scenarioGroups: ['ONLINE_BOOKING'],
    })
    expect(createInput.data.publicToken).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(mocks.organizationFindUnique).toHaveBeenCalledWith({
      where: { id: 'org-1' },
      select: { id: true, name: true },
    })
  })

  it('records all results atomically with the campaign organization, never a submitted one', async () => {
    const created = await createTestFeedback({
      publicToken: 'public-token',
      profile: 'USER',
      environment: 'Firefox',
      campaignReview: {
        clarity: 'MOSTLY_CLEAR',
        duration: 'ABOUT_RIGHT',
        links: 'VERY_USEFUL',
        satisfaction: 'SATISFIED',
        comment: 'Les liens directs m’ont aidé.',
      },
      results: [{
        scenarioId: 'CUS-01',
        scenarioTitle: 'Réservation',
        scenarioPriority: 'P0',
        status: 'FAIL',
        comment: 'Le formulaire bloque.',
      }],
    })

    expect(created).toBe(true)
    expect(mocks.transaction).toHaveBeenCalledOnce()
    expect(mocks.transactionClient.testFeedback.createMany).toHaveBeenCalledWith({
      data: [{
        campaignId: 'campaign-1',
        organizationId: 'org-1',
        profile: 'USER',
        scenarioId: 'CUS-01',
        scenarioTitle: 'Réservation',
        scenarioPriority: 'P0',
        status: 'FAIL',
        environment: 'Firefox',
        comment: 'Le formulaire bloque.',
      }],
    })
    expect(mocks.transactionClient.testCampaignReview.create).toHaveBeenCalledWith({
      data: {
        campaignId: 'campaign-1',
        organizationId: 'org-1',
        profile: 'USER',
        clarity: 'MOSTLY_CLEAR',
        duration: 'ABOUT_RIGHT',
        links: 'VERY_USEFUL',
        satisfaction: 'SATISFIED',
        comment: 'Les liens directs m’ont aidé.',
      },
    })
  })

  it('returns anonymous campaign review answers in the technical campaign detail', async () => {
    mocks.campaignFindUnique.mockResolvedValueOnce({
      id: 'campaign-1',
      name: 'Recette bêta',
      scenarioGroups: ['ONLINE_BOOKING'],
      profiles: ['USER'],
      status: 'ACTIVE',
      publicToken: 'public-token',
      createdAt: new Date('2026-10-04T09:00:00.000Z'),
      closedAt: null,
      organization: { name: 'Osez le T’re' },
      feedback: [],
      campaignReviews: [{
        id: 'review-1',
        profile: 'USER',
        clarity: 'MOSTLY_CLEAR',
        duration: 'ABOUT_RIGHT',
        links: 'VERY_USEFUL',
        satisfaction: 'SATISFIED',
        comment: 'Les liens directs m’ont aidé.',
        createdAt: new Date('2026-10-04T09:30:00.000Z'),
      }],
    })

    const detail = await getTestCampaignDetail('campaign-1')

    expect(detail?.campaignReviews).toEqual([{
      id: 'review-1',
      profile: 'USER',
      clarity: 'MOSTLY_CLEAR',
      duration: 'ABOUT_RIGHT',
      links: 'VERY_USEFUL',
      satisfaction: 'SATISFIED',
      comment: 'Les liens directs m’ont aidé.',
      createdAt: new Date('2026-10-04T09:30:00.000Z'),
    }])
    expect(mocks.campaignFindUnique).toHaveBeenCalledWith(expect.objectContaining({
      include: expect.objectContaining({
        campaignReviews: {
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        },
      }),
    }))
  })

  it('does not record results for closed campaigns or profiles not enabled for that campaign', async () => {
    mocks.transactionClient.testCampaign.findUnique.mockResolvedValueOnce({
      id: 'campaign-1',
      organizationId: 'org-1',
      status: 'CLOSED',
      profiles: ['USER'],
      scenarioGroups: ['ONLINE_BOOKING'],
    })
    const closedResult = await createTestFeedback({
      publicToken: 'public-token',
      profile: 'USER',
      results: [{ scenarioId: 'CUS-01', scenarioTitle: 'Réservation', scenarioPriority: 'P0', status: 'PASS' }],
    })
    expect(closedResult).toBe(false)

    mocks.transactionClient.testCampaign.findUnique.mockResolvedValueOnce({
      id: 'campaign-1',
      organizationId: 'org-1',
      status: 'ACTIVE',
      profiles: ['ADMIN'],
      scenarioGroups: ['STAFF_ADMINISTRATION'],
    })
    const wrongProfileResult = await createTestFeedback({
      publicToken: 'public-token',
      profile: 'USER',
      results: [{ scenarioId: 'CUS-01', scenarioTitle: 'Réservation', scenarioPriority: 'P0', status: 'PASS' }],
    })
    expect(wrongProfileResult).toBe(false)
    expect(mocks.transactionClient.testFeedback.createMany).not.toHaveBeenCalled()
  })

  it('rejects feedback outside the selected scenario groups', async () => {
    const created = await createTestFeedback({
      publicToken: 'public-token',
      profile: 'USER',
      results: [{
        scenarioId: 'CUS-11',
        scenarioTitle: 'Mes rendez-vous',
        scenarioPriority: 'P1',
        status: 'PASS',
      }],
    })

    expect(created).toBe(false)
    expect(mocks.transactionClient.testFeedback.createMany).not.toHaveBeenCalled()
  })

  it('closes an active campaign and reports missing campaigns', async () => {
    expect(await closeTestCampaign('campaign-1')).toBe('closed')
    expect(mocks.campaignUpdateMany).toHaveBeenCalledWith({
      where: { id: 'campaign-1', status: 'ACTIVE' },
      data: { status: 'CLOSED', closedAt: expect.any(Date) },
    })

    mocks.campaignUpdateMany.mockResolvedValueOnce({ count: 0 })
    mocks.campaignFindUnique.mockResolvedValueOnce(null)
    expect(await closeTestCampaign('missing')).toBe('not_found')
  })
})

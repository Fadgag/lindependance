import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const transactionClient = {
    testCampaign: { findUnique: vi.fn() },
    testFeedback: { createMany: vi.fn() },
  }
  return {
    organizationFindUnique: vi.fn(),
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
    organization: { findUnique: mocks.organizationFindUnique },
    testCampaign: {
      create: mocks.campaignCreate,
      findUnique: mocks.campaignFindUnique,
      updateMany: mocks.campaignUpdateMany,
    },
    testFeedback: { createMany: mocks.feedbackCreateMany },
    $transaction: mocks.transaction,
  },
}))

import { createTestCampaign, createTestFeedback, closeTestCampaign } from '@/services/testFeedback.service'

beforeEach(() => {
  vi.resetAllMocks()
  mocks.organizationFindUnique.mockResolvedValue({ id: 'org-1' })
  mocks.campaignCreate.mockResolvedValue({ id: 'campaign-1' })
  mocks.transactionClient.testCampaign.findUnique.mockResolvedValue({
    id: 'campaign-1',
    organizationId: 'org-1',
    status: 'ACTIVE',
    profiles: ['USER'],
  })
  mocks.transactionClient.testFeedback.createMany.mockResolvedValue({ count: 1 })
  mocks.campaignUpdateMany.mockResolvedValue({ count: 1 })
})

describe('test feedback service', () => {
  it('creates campaigns only for existing organizations with an opaque random token', async () => {
    await createTestCampaign({
      name: 'Recette bêta',
      build: 'abc123',
      organizationId: 'org-1',
      profiles: ['USER'],
    })

    const [createInput] = mocks.campaignCreate.mock.calls[0]
    expect(createInput.data).toMatchObject({
      name: 'Recette bêta',
      build: 'abc123',
      organizationId: 'org-1',
      profiles: ['USER'],
    })
    expect(createInput.data.publicToken).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(mocks.organizationFindUnique).toHaveBeenCalledWith({
      where: { id: 'org-1' },
      select: { id: true },
    })
  })

  it('records all results atomically with the campaign organization, never a submitted one', async () => {
    const created = await createTestFeedback({
      publicToken: 'public-token',
      profile: 'USER',
      environment: 'Firefox',
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
  })

  it('does not record results for closed campaigns or profiles not enabled for that campaign', async () => {
    mocks.transactionClient.testCampaign.findUnique.mockResolvedValueOnce({
      id: 'campaign-1',
      organizationId: 'org-1',
      status: 'CLOSED',
      profiles: ['USER'],
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
    })
    const wrongProfileResult = await createTestFeedback({
      publicToken: 'public-token',
      profile: 'USER',
      results: [{ scenarioId: 'CUS-01', scenarioTitle: 'Réservation', scenarioPriority: 'P0', status: 'PASS' }],
    })
    expect(wrongProfileResult).toBe(false)
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

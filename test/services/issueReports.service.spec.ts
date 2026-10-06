import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  customerFindMany: vi.fn(),
  issueReportCreate: vi.fn(),
  issueReportDeleteMany: vi.fn(),
  issueReportFindMany: vi.fn(),
  issueReportUpdateMany: vi.fn(),
  issueReportFindUnique: vi.fn(),
  findEnabledPortalOrganization: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique },
    customer: { findMany: mocks.customerFindMany },
    issueReport: {
      create: mocks.issueReportCreate,
      deleteMany: mocks.issueReportDeleteMany,
      findMany: mocks.issueReportFindMany,
      updateMany: mocks.issueReportUpdateMany,
      findUnique: mocks.issueReportFindUnique,
    },
  },
}))
vi.mock('@/services/customerPortal.service', () => ({
  findEnabledPortalOrganizationForSession: mocks.findEnabledPortalOrganization,
}))

import {
  createIssueReport,
  getCustomerIssueReportSubmitter,
  getStaffIssueReportSubmitter,
  listIssueReports,
  updateIssueReportStatus,
} from '@/services/issueReports.service'
import { findEnabledPortalOrganizationForSession } from '@/services/customerPortal.service'

function reportRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'report-1',
    organizationId: 'org-1',
    organization: { name: 'Salon A' },
    reporterType: 'CUSTOMER',
    reporterName: 'Camille Martin',
    reporterEmail: 'camille@example.test',
    title: 'La page se bloque',
    description: 'La page ne répond plus après validation.',
    steps: 'Ouvrir le portail puis valider le rendez-vous.',
    pathname: '/portail/salon-a/mes-rdv',
    appVersion: '0.1.0',
    errors: [{ name: 'TypeError', message: 'Erreur expurgée' }],
    status: 'NEW',
    createdAt: new Date('2026-10-06T12:00:00.000Z'),
    resolvedAt: null,
    ...overrides,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(findEnabledPortalOrganizationForSession).mockResolvedValue({
    id: 'org-1',
    name: 'Salon A',
    timezone: 'Europe/Paris',
    openingTime: '08:00',
    closingTime: '20:00',
  })
  vi.mocked(mocks.customerFindMany).mockResolvedValue([{
    firstName: 'Camille',
    lastName: 'Martin',
  }])
  vi.mocked(mocks.issueReportCreate).mockResolvedValue({
    id: 'report-1',
    createdAt: new Date('2026-10-06T12:00:00.000Z'),
  })
  vi.mocked(mocks.issueReportDeleteMany).mockResolvedValue({ count: 0 })
  vi.mocked(mocks.issueReportFindMany).mockResolvedValue([reportRecord()])
  vi.mocked(mocks.issueReportUpdateMany).mockResolvedValue({ count: 1 })
  vi.mocked(mocks.issueReportFindUnique).mockResolvedValue(reportRecord({ status: 'RESOLVED' }))
})

describe('issue report submitters', () => {
  it('resolves staff identity and organization from the authenticated account', async () => {
    vi.mocked(mocks.userFindUnique).mockResolvedValue({
      name: 'Alex Durand',
      email: 'alex@example.test',
      organizationId: 'org-1',
      organization: { name: 'Salon A' },
    })

    await expect(getStaffIssueReportSubmitter('user-1')).resolves.toEqual({
      organizationId: 'org-1',
      organizationName: 'Salon A',
      reporterType: 'STAFF',
      reporterName: 'Alex Durand',
      reporterEmail: 'alex@example.test',
    })
    expect(mocks.userFindUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'user-1' },
    }))
  })

  it('uses verified portal email and organization, and avoids guessing among duplicate customer records', async () => {
    vi.mocked(mocks.customerFindMany).mockResolvedValue([
      { firstName: 'Camille', lastName: 'Martin' },
      { firstName: 'Noé', lastName: 'Martin' },
    ])

    await expect(getCustomerIssueReportSubmitter({
      accountType: 'CUSTOMER',
      organizationId: 'org-1',
      verifiedEmail: ' Camille@Example.test ',
      expiresAt: Date.now() + 60_000,
    })).resolves.toEqual({
      organizationId: 'org-1',
      organizationName: 'Salon A',
      reporterType: 'CUSTOMER',
      reporterName: null,
      reporterEmail: 'camille@example.test',
    })
    expect(mocks.customerFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        organizationId: 'org-1',
        email: { equals: 'camille@example.test', mode: 'insensitive' },
      },
      take: 2,
    }))
  })
})

describe('issue report persistence', () => {
  it('stores server-resolved identity and sanitized diagnostics', async () => {
    const input = {
      submitter: {
        organizationId: 'org-1',
        organizationName: 'Salon A',
        reporterType: 'CUSTOMER' as const,
        reporterName: 'Camille Martin',
        reporterEmail: 'camille@example.test',
      },
      input: {
        title: 'La page se bloque',
        description: 'La page ne répond plus après validation.',
        steps: 'Ouvrir le portail puis valider le rendez-vous.',
        pathname: '/portail/salon-a/mes-rdv',
        errors: [{
          name: 'TypeError',
          message: 'Échec pour camille@example.test via https://example.test/?token=private',
        }],
      },
      appVersion: '0.1.0',
      now: new Date('2026-10-06T12:00:00.000Z'),
    }

    await createIssueReport(input)

    expect(mocks.issueReportCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: 'org-1',
        reporterType: 'CUSTOMER',
        reporterName: 'Camille Martin',
        reporterEmail: 'camille@example.test',
        pathname: '/portail/salon-a/mes-rdv',
        appVersion: '0.1.0',
        errors: [{
          name: 'TypeError',
          message: expect.not.stringContaining('camille@example.test'),
        }],
        createdAt: input.now,
      }),
      select: { id: true, createdAt: true },
    })
  })

  it('purges resolved reports after 90 days and returns valid report data', async () => {
    const now = new Date('2026-10-06T12:00:00.000Z')

    const reports = await listIssueReports(now)

    expect(mocks.issueReportDeleteMany).toHaveBeenCalledWith({
      where: {
        status: 'RESOLVED',
        resolvedAt: { lte: new Date('2026-07-08T12:00:00.000Z') },
      },
    })
    expect(mocks.issueReportFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        OR: [
          { resolvedAt: null },
          { resolvedAt: { gt: new Date('2026-07-08T12:00:00.000Z') } },
        ],
      },
    }))
    expect(reports[0]).toMatchObject({
      id: 'report-1',
      organizationName: 'Salon A',
      status: 'NEW',
      createdAt: '2026-10-06T12:00:00.000Z',
      errors: [{ name: 'TypeError', message: 'Erreur expurgée' }],
    })
  })

  it('starts the 90-day retention period when a report is resolved', async () => {
    const now = new Date('2026-10-06T12:00:00.000Z')
    await updateIssueReportStatus('report-1', 'RESOLVED', now)

    expect(mocks.issueReportUpdateMany).toHaveBeenCalledWith({
      where: { id: 'report-1' },
      data: { status: 'RESOLVED', resolvedAt: now },
    })
  })
})

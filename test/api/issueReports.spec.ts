import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getSubmitterAccess: vi.fn(),
  getAdminAccess: vi.fn(),
  createIssueReport: vi.fn(),
  listIssueReports: vi.fn(),
  updateIssueReportStatus: vi.fn(),
  getIssueReportAppVersion: vi.fn(),
  consumePortalRateLimits: vi.fn(),
  getCustomerPortalSecret: vi.fn(),
  hashRateLimitKey: vi.fn(),
}))

vi.mock('@/lib/issueReportAccess', () => ({
  getIssueReportSubmitterAccess: mocks.getSubmitterAccess,
}))
vi.mock('@/lib/testCampaignAccess', () => ({
  getTestCampaignAdminAccess: mocks.getAdminAccess,
}))
vi.mock('@/services/issueReports.service', () => ({
  createIssueReport: mocks.createIssueReport,
  listIssueReports: mocks.listIssueReports,
  updateIssueReportStatus: mocks.updateIssueReportStatus,
  getIssueReportAppVersion: mocks.getIssueReportAppVersion,
}))
vi.mock('@/services/customerPortal.service', () => ({
  consumePortalRateLimits: mocks.consumePortalRateLimits,
}))
vi.mock('@/lib/customerPortalSecurity', () => ({
  getCustomerPortalSecret: mocks.getCustomerPortalSecret,
  hashRateLimitKey: mocks.hashRateLimitKey,
}))

import { GET as getIssueReportContext } from '@/app/api/issue-reports/context/route'
import { GET as getIssueReports, POST as postIssueReport } from '@/app/api/issue-reports/route'
import { PATCH as patchIssueReport } from '@/app/api/issue-reports/[id]/route'
import { consumePortalRateLimits } from '@/services/customerPortal.service'
import {
  createIssueReport,
  getIssueReportAppVersion,
  listIssueReports,
  updateIssueReportStatus,
} from '@/services/issueReports.service'
import { getIssueReportSubmitterAccess } from '@/lib/issueReportAccess'
import { getTestCampaignAdminAccess } from '@/lib/testCampaignAccess'
import { getCustomerPortalSecret, hashRateLimitKey } from '@/lib/customerPortalSecurity'

const submitter = {
  organizationId: 'org-1',
  organizationName: 'Salon A',
  reporterType: 'CUSTOMER' as const,
  reporterName: 'Camille Martin',
  reporterEmail: 'camille@example.test',
}

const submission = {
  title: 'Le portail se bloque',
  description: 'La page ne répond plus après la validation.',
  steps: 'Ouvrir le portail puis valider le rendez-vous.',
  pathname: '/portail/salon-a/mes-rdv',
  errors: [{ name: 'TypeError', message: 'Erreur de rendu' }],
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(getIssueReportSubmitterAccess).mockResolvedValue({ authorized: true, submitter })
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
  vi.mocked(createIssueReport).mockResolvedValue({ id: 'report-1', createdAt: new Date('2026-10-06T12:00:00Z') })
  vi.mocked(listIssueReports).mockResolvedValue([])
  vi.mocked(updateIssueReportStatus).mockResolvedValue({
    id: 'report-1',
    organizationName: 'Salon A',
    reporterType: 'CUSTOMER',
    reporterName: 'Camille Martin',
    reporterEmail: 'camille@example.test',
    title: submission.title,
    description: submission.description,
    steps: submission.steps,
    pathname: submission.pathname,
    appVersion: '0.1.0',
    errors: submission.errors,
    status: 'RESOLVED',
    createdAt: '2026-10-06T12:00:00.000Z',
    resolvedAt: '2026-10-06T13:00:00.000Z',
  })
  vi.mocked(getIssueReportAppVersion).mockReturnValue('0.1.0')
  vi.mocked(consumePortalRateLimits).mockResolvedValue(true)
  vi.mocked(getCustomerPortalSecret).mockReturnValue('test-secret')
  vi.mocked(hashRateLimitKey).mockReturnValue('reporter-hash')
})

describe('issue report submission API', () => {
  it('returns the authenticated reporter context and explains what is collected', async () => {
    const response = await getIssueReportContext(new Request('https://example.test/api/issue-reports/context'))

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      reporterName: 'Camille Martin',
      reporterEmail: 'camille@example.test',
      organizationName: 'Salon A',
      appVersion: '0.1.0',
    })
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
  })

  it('rejects submissions without an authenticated reporter', async () => {
    vi.mocked(getIssueReportSubmitterAccess).mockResolvedValue({ authorized: false, status: 401 })

    const response = await postIssueReport(new Request('https://example.test/api/issue-reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submission),
    }))

    expect(response.status).toBe(401)
    expect(createIssueReport).not.toHaveBeenCalled()
  })

  it('uses the server-resolved reporter, applies rate limiting, and creates the report', async () => {
    const response = await postIssueReport(new Request('https://example.test/api/issue-reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submission),
    }))

    expect(response.status).toBe(201)
    expect(consumePortalRateLimits).toHaveBeenCalledOnce()
    expect(hashRateLimitKey).toHaveBeenCalledWith(
      'issue-report',
      'org-1:camille@example.test',
      'test-secret',
    )
    expect(createIssueReport).toHaveBeenCalledWith({
      submitter,
      input: submission,
      appVersion: '0.1.0',
    })
  })

  it('does not accept client-supplied organization or reporter identity', async () => {
    const response = await postIssueReport(new Request('https://example.test/api/issue-reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...submission,
        organizationId: 'another-org',
        reporterEmail: 'attacker@example.test',
      }),
    }))

    expect(response.status).toBe(400)
    expect(createIssueReport).not.toHaveBeenCalled()
  })

  it('returns a rate-limit response instead of storing excess reports', async () => {
    vi.mocked(consumePortalRateLimits).mockResolvedValue(false)

    const response = await postIssueReport(new Request('https://example.test/api/issue-reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submission),
    }))

    expect(response.status).toBe(429)
    expect(createIssueReport).not.toHaveBeenCalled()
  })
})

describe('technical issue report dashboard API', () => {
  it('lists reports only for technical admins', async () => {
    vi.mocked(getTestCampaignAdminAccess).mockResolvedValue({ authorized: false, status: 403 })

    const response = await getIssueReports(new Request('https://example.test/api/issue-reports'))

    expect(response.status).toBe(403)
    expect(listIssueReports).not.toHaveBeenCalled()
  })

  it('does not cache technical report data', async () => {
    const response = await getIssueReports(new Request('https://example.test/api/issue-reports'))

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
  })

  it('validates and applies multiple optional organization filters for technical admins', async () => {
    const response = await getIssueReports(new Request(
      'https://example.test/api/issue-reports?organizationId=org-2&organizationId=org-3',
    ))

    expect(response.status).toBe(200)
    expect(listIssueReports).toHaveBeenCalledWith({ organizationIds: ['org-2', 'org-3'] })
  })

  it('rejects malformed organization filters', async () => {
    const response = await getIssueReports(new Request(
      'https://example.test/api/issue-reports?organizationId=',
    ))

    expect(response.status).toBe(400)
    expect(listIssueReports).not.toHaveBeenCalled()
  })

  it('allows technical admins to update report status', async () => {
    const response = await patchIssueReport(
      new Request('https://example.test/api/issue-reports/report-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'RESOLVED' }),
      }),
      { params: Promise.resolve({ id: 'report-1' }) },
    )

    expect(response.status).toBe(200)
    expect(updateIssueReportStatus).toHaveBeenCalledWith('report-1', 'RESOLVED')
  })

  it('rejects invalid status updates', async () => {
    const response = await patchIssueReport(
      new Request('https://example.test/api/issue-reports/report-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CLOSED' }),
      }),
      { params: Promise.resolve({ id: 'report-1' }) },
    )

    expect(response.status).toBe(400)
    expect(updateIssueReportStatus).not.toHaveBeenCalled()
  })
})

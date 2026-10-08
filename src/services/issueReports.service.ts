import appMetadata from '../../package.json'
import type { CustomerPortalSession } from '@/lib/customerPortalSecurity'
import { normalizeCustomerEmail } from '@/lib/customerPortalSecurity'
import {
  IssueClientErrorSchema,
  IssueReportReporterTypeSchema,
  IssueReportStatusSchema,
  type IssueReportStatus,
  type IssueReportSubmission,
} from '@/schemas/issueReport'
import { sanitizeIssueDiagnostics } from '@/domain/issue-reporting/issueReporting'
import { findEnabledPortalOrganizationForSession } from '@/services/customerPortal.service'
import { prisma } from '@/lib/prisma'

export type IssueReportSubmitter = {
  organizationId: string | null
  organizationName: string | null
  reporterType: 'STAFF' | 'CUSTOMER'
  reporterName: string | null
  reporterEmail: string
}

type IssueReportView = {
  id: string
  organizationName: string | null
  reporterType: 'STAFF' | 'CUSTOMER'
  reporterName: string | null
  reporterEmail: string
  title: string
  description: string
  steps: string
  pathname: string
  appVersion: string
  errors: Array<{ name: string; message: string }>
  status: IssueReportStatus
  createdAt: string
  resolvedAt: string | null
}

const RETENTION_MS = 90 * 24 * 60 * 60 * 1000

export function getIssueReportAppVersion(): string {
  return process.env.NEXT_PUBLIC_APP_VERSION?.trim() || appMetadata.version
}

export async function getStaffIssueReportSubmitter(userId: string): Promise<IssueReportSubmitter | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      organizationId: true,
      organization: { select: { name: true } },
    },
  })
  if (!user?.email) return null

  return {
    organizationId: user.organizationId,
    organizationName: user.organization?.name ?? null,
    reporterType: 'STAFF',
    reporterName: user.name,
    reporterEmail: user.email,
  }
}

export async function getCustomerIssueReportSubmitter(
  session: CustomerPortalSession,
): Promise<IssueReportSubmitter | null> {
  const organization = await findEnabledPortalOrganizationForSession(session)
  if (!organization) return null

  const customers = await prisma.customer.findMany({
    where: {
      organizationId: organization.id,
      email: { equals: normalizeCustomerEmail(session.verifiedEmail), mode: 'insensitive' },
    },
    select: { firstName: true, lastName: true },
    take: 2,
  })
  const reporterName = customers.length === 1
    ? `${customers[0]?.firstName ?? ''} ${customers[0]?.lastName ?? ''}`.trim() || null
    : null

  return {
    organizationId: organization.id,
    organizationName: organization.name,
    reporterType: 'CUSTOMER',
    reporterName,
    reporterEmail: normalizeCustomerEmail(session.verifiedEmail),
  }
}

function mapIssueReport(report: {
  id: string
  organization: { name: string } | null
  reporterType: string
  reporterName: string | null
  reporterEmail: string
  title: string
  description: string
  steps: string
  pathname: string
  appVersion: string
  errors: unknown
  status: string
  createdAt: Date
  resolvedAt: Date | null
}): IssueReportView {
  return {
    id: report.id,
    organizationName: report.organization?.name ?? null,
    reporterType: IssueReportReporterTypeSchema.parse(report.reporterType),
    reporterName: report.reporterName,
    reporterEmail: report.reporterEmail,
    title: report.title,
    description: report.description,
    steps: report.steps,
    pathname: report.pathname,
    appVersion: report.appVersion,
    errors: IssueClientErrorSchema.array().parse(report.errors),
    status: IssueReportStatusSchema.parse(report.status),
    createdAt: report.createdAt.toISOString(),
    resolvedAt: report.resolvedAt?.toISOString() ?? null,
  }
}

export async function createIssueReport(input: {
  submitter: IssueReportSubmitter
  input: IssueReportSubmission
  appVersion: string
  now?: Date
}): Promise<{ id: string; createdAt: Date }> {
  const diagnostics = sanitizeIssueDiagnostics({
    pathname: input.input.pathname,
    errors: input.input.errors,
  })
  return prisma.issueReport.create({
    data: {
      organizationId: input.submitter.organizationId,
      reporterType: input.submitter.reporterType,
      reporterName: input.submitter.reporterName,
      reporterEmail: input.submitter.reporterEmail,
      title: input.input.title,
      description: input.input.description,
      steps: input.input.steps,
      pathname: diagnostics.pathname,
      appVersion: input.appVersion,
      errors: diagnostics.errors,
      createdAt: input.now,
    },
    select: { id: true, createdAt: true },
  })
}

async function purgeResolvedIssueReports(now: Date): Promise<void> {
  await prisma.issueReport.deleteMany({
    where: {
      status: 'RESOLVED',
      resolvedAt: { lte: new Date(now.getTime() - RETENTION_MS) },
    },
  })
}

export async function listIssueReports(options: { now?: Date; organizationIds?: string[] } = {}): Promise<IssueReportView[]> {
  const now = options.now ?? new Date()
  await purgeResolvedIssueReports(now)
  const reports = await prisma.issueReport.findMany({
    where: {
      ...(options.organizationIds?.length
        ? { organizationId: { in: options.organizationIds } }
        : {}),
      OR: [
        { resolvedAt: null },
        { resolvedAt: { gt: new Date(now.getTime() - RETENTION_MS) } },
      ],
    },
    include: { organization: { select: { name: true } } },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  })
  return reports.map(mapIssueReport)
}

export async function updateIssueReportStatus(
  id: string,
  status: IssueReportStatus,
  now = new Date(),
): Promise<IssueReportView | null> {
  await purgeResolvedIssueReports(now)
  const result = await prisma.issueReport.updateMany({
    where: { id },
    data: {
      status,
      resolvedAt: status === 'RESOLVED' ? now : null,
    },
  })
  if (result.count === 0) return null

  const report = await prisma.issueReport.findUnique({
    where: { id },
    include: { organization: { select: { name: true } } },
  })
  return report ? mapIssueReport(report) : null
}

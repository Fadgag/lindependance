import { z } from 'zod'

export const IssueReportStatusSchema = z.enum(['NEW', 'IN_PROGRESS', 'RESOLVED'])
export const IssueReportReporterTypeSchema = z.enum(['STAFF', 'CUSTOMER'])

export const IssueClientErrorSchema = z.object({
  name: z.string().trim().min(1).max(100),
  message: z.string().trim().min(1).max(2_000),
})

export const IssueReportSubmissionSchema = z.object({
  title: z.string().trim().min(4).max(120),
  description: z.string().trim().min(10).max(3_000),
  steps: z.string().trim().min(1).max(3_000),
  pathname: z.string().min(1).max(300).regex(/^\/(?!\/)[^?#]*$/),
  errors: z.array(IssueClientErrorSchema).max(5),
}).strict()

export const UpdateIssueReportSchema = z.object({
  status: IssueReportStatusSchema,
}).strict()

export const IssueReportIdSchema = z.string().trim().min(1).max(128)

export const IssueReportReporterContextSchema = z.object({
  reporterName: z.string().nullable(),
  reporterEmail: z.string().email(),
  organizationName: z.string().nullable(),
  appVersion: z.string().min(1),
})

export const IssueReportDashboardRecordSchema = z.object({
  id: IssueReportIdSchema,
  organizationName: z.string().nullable(),
  reporterType: IssueReportReporterTypeSchema,
  reporterName: z.string().nullable(),
  reporterEmail: z.string().email(),
  title: z.string(),
  description: z.string(),
  steps: z.string(),
  pathname: z.string(),
  appVersion: z.string(),
  errors: z.array(IssueClientErrorSchema),
  status: IssueReportStatusSchema,
  createdAt: z.string().datetime(),
  resolvedAt: z.string().datetime().nullable(),
})

export type IssueReportSubmission = z.infer<typeof IssueReportSubmissionSchema>
export type IssueReportStatus = z.infer<typeof IssueReportStatusSchema>
export type IssueReportReporterContext = z.infer<typeof IssueReportReporterContextSchema>

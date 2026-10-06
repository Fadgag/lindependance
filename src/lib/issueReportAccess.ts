import { auth } from '@/auth'
import type { IssueReportSubmitter } from '@/services/issueReports.service'
import {
  getCustomerIssueReportSubmitter,
  getStaffIssueReportSubmitter,
} from '@/services/issueReports.service'
import { getCustomerPortalSession } from '@/services/customerPortal.service'

export type IssueReportSubmitterAccess =
  | { authorized: false; status: 401 | 403 }
  | { authorized: true; submitter: IssueReportSubmitter }

export async function getIssueReportSubmitterAccess(
  request: Request,
): Promise<IssueReportSubmitterAccess> {
  const session = await auth()
  if (session?.user?.accountType === 'STAFF') {
    const submitter = await getStaffIssueReportSubmitter(session.user.id)
    return submitter
      ? { authorized: true, submitter }
      : { authorized: false, status: 403 }
  }

  const portalSession = await getCustomerPortalSession(request)
  if (!portalSession) return { authorized: false, status: 401 }
  const submitter = await getCustomerIssueReportSubmitter(portalSession)
  return submitter
    ? { authorized: true, submitter }
    : { authorized: false, status: 403 }
}

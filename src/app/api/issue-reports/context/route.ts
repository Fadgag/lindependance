import { NextResponse } from 'next/server'
import { apiErrorResponse } from '@/lib/api'
import { getIssueReportSubmitterAccess } from '@/lib/issueReportAccess'
import { getIssueReportAppVersion } from '@/services/issueReports.service'

export async function GET(request: Request) {
  try {
    const access = await getIssueReportSubmitterAccess(request)
    if (!access.authorized) {
      return NextResponse.json({ error: 'Connectez-vous pour envoyer un signalement.' }, { status: access.status })
    }

    return NextResponse.json({
      reporterName: access.submitter.reporterName,
      reporterEmail: access.submitter.reporterEmail,
      organizationName: access.submitter.organizationName,
      appVersion: getIssueReportAppVersion(),
    }, {
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch (error: unknown) {
    return apiErrorResponse(error)
  }
}

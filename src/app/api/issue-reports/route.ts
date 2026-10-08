import { NextResponse } from 'next/server'
import { apiErrorResponse } from '@/lib/api'
import { getIssueReportSubmitterAccess } from '@/lib/issueReportAccess'
import { getTestCampaignAdminAccess } from '@/lib/testCampaignAccess'
import {
  getCustomerPortalSecret,
  hashRateLimitKey,
} from '@/lib/customerPortalSecurity'
import { consumePortalRateLimits } from '@/services/customerPortal.service'
import {
  createIssueReport,
  getIssueReportAppVersion,
  listIssueReports,
} from '@/services/issueReports.service'
import { IssueReportSubmissionSchema } from '@/schemas/issueReport'
import { TechAdminOrganizationFilterSchema } from '@/schemas/techAdmin'

const REPORT_WINDOW_MS = 60 * 60 * 1000
const REPORT_LIMIT = 5

export async function GET(request: Request) {
  try {
    const access = await getTestCampaignAdminAccess()
    if (!access.authorized) {
      return NextResponse.json({ error: 'Accès réservé aux administrateurs techniques.' }, { status: access.status })
    }
    const searchParams = new URL(request.url).searchParams
    const filters = TechAdminOrganizationFilterSchema.safeParse({
      organizationIds: searchParams.getAll('organizationId'),
    })
    if (!filters.success) {
      return NextResponse.json({ error: 'Filtre de domaine invalide.' }, { status: 400 })
    }
    return NextResponse.json(await listIssueReports(filters.data), {
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch (error: unknown) {
    return apiErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const access = await getIssueReportSubmitterAccess(request)
    if (!access.authorized) {
      return NextResponse.json({ error: 'Connectez-vous pour envoyer un signalement.' }, { status: access.status })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Le formulaire envoyé est illisible.' }, { status: 400 })
    }
    const parsed = IssueReportSubmissionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Vérifiez les informations du signalement.' }, { status: 400 })
    }

    const allowed = await consumePortalRateLimits([{
      scope: 'issue-report-submission',
      keyHash: hashRateLimitKey(
        'issue-report',
        `${access.submitter.organizationId ?? 'internal'}:${access.submitter.reporterEmail.trim().toLowerCase()}`,
        getCustomerPortalSecret(),
      ),
      limit: REPORT_LIMIT,
      windowMilliseconds: REPORT_WINDOW_MS,
    }])
    if (!allowed) {
      return NextResponse.json({ error: 'Trop de signalements envoyés. Réessayez plus tard.' }, { status: 429 })
    }

    const created = await createIssueReport({
      submitter: access.submitter,
      input: parsed.data,
      appVersion: getIssueReportAppVersion(),
    })
    return NextResponse.json({ id: created.id, createdAt: created.createdAt }, { status: 201 })
  } catch (error: unknown) {
    return apiErrorResponse(error)
  }
}

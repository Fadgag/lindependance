import { NextResponse } from 'next/server'
import { apiErrorResponse } from '@/lib/api'
import { getTestCampaignAdminAccess } from '@/lib/testCampaignAccess'
import {
  IssueReportIdSchema,
  UpdateIssueReportSchema,
} from '@/schemas/issueReport'
import { updateIssueReportStatus } from '@/services/issueReports.service'

type IssueReportContext = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: IssueReportContext) {
  try {
    const access = await getTestCampaignAdminAccess()
    if (!access.authorized) {
      return NextResponse.json({ error: 'Accès réservé aux administrateurs techniques.' }, { status: access.status })
    }

    const id = IssueReportIdSchema.safeParse((await params).id)
    if (!id.success) return NextResponse.json({ error: 'Signalement introuvable.' }, { status: 404 })

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'La mise à jour envoyée est illisible.' }, { status: 400 })
    }
    const parsed = UpdateIssueReportSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'État de traitement invalide.' }, { status: 400 })
    }

    const report = await updateIssueReportStatus(id.data, parsed.data.status)
    if (!report) return NextResponse.json({ error: 'Signalement introuvable.' }, { status: 404 })
    return NextResponse.json(report)
  } catch (error: unknown) {
    return apiErrorResponse(error)
  }
}

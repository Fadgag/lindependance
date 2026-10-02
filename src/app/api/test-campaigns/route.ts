import { NextResponse } from 'next/server'
import { apiErrorResponse } from '@/lib/api'
import { getTestCampaignAdminAccess } from '@/lib/testCampaignAccess'
import { CreateTestCampaignSchema } from '@/schemas/testFeedback'
import {
  createTestCampaign,
  listTestCampaigns,
  listTestCampaignRecipients,
} from '@/services/testFeedback.service'
import { sendTestCampaignInvitationEmails } from '@/services/testCampaignInvitationEmail.service'

export async function GET() {
  try {
    const access = await getTestCampaignAdminAccess()
    if (!access.authorized) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: access.status })
    }
    return NextResponse.json(await listTestCampaigns())
  } catch (error: unknown) {
    return apiErrorResponse(error)
  }
}

export async function POST(request: Request) {
  let access: Awaited<ReturnType<typeof getTestCampaignAdminAccess>>
  try {
    access = await getTestCampaignAdminAccess()
  } catch (error: unknown) {
    return apiErrorResponse(error)
  }
  if (!access.authorized) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: access.status })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 })
  }

  const parsed = CreateTestCampaignSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Informations de campagne invalides' }, { status: 400 })
  }

  try {
    const {
      recipientIds,
      emailSubject,
      emailMessage,
      ...campaignInput
    } = parsed.data
    const recipients = recipientIds.length
      ? await listTestCampaignRecipients(campaignInput.organizationId, recipientIds)
      : []
    if (recipients.length !== recipientIds.length) {
      return NextResponse.json({ error: 'Un ou plusieurs destinataires ne correspondent pas à l’organisation sélectionnée.' }, { status: 400 })
    }

    const publicBaseUrl = process.env.NEXT_PUBLIC_APP_URL
      || process.env.NEXTAUTH_URL
      || new URL(request.url).origin
    const campaignBaseUrl = new URL(publicBaseUrl)
    const campaign = await createTestCampaign(campaignInput)
    if (!campaign) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 404 })

    const campaignUrl = new URL(`/retour-test/${campaign.publicToken}`, campaignBaseUrl).toString()
    const delivery = await sendTestCampaignInvitationEmails({
      recipients: recipients.map(({ email, name }) => ({ to: email, recipientName: name })),
      campaignName: campaign.name,
      organizationName: campaign.organizationName,
      campaignUrl,
      subject: emailSubject,
      message: emailMessage,
    })
    const failedIndexes = new Set(delivery.failedIndexes)
    const failedRecipients = recipients
      .filter((_, index) => failedIndexes.has(index))
      .map((recipient) => recipient.name || recipient.email)
    return NextResponse.json({
      ...campaign,
      invitations: {
        sent: recipients.length - failedRecipients.length,
        failedRecipients,
        deliveryError: delivery.error,
      },
    }, { status: 201 })
  } catch (error: unknown) {
    return apiErrorResponse(error)
  }
}

import { Resend } from 'resend'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function sendTestCampaignInvitationEmails(input: {
  recipients: Array<{ to: string; recipientName: string | null }>
  campaignName: string
  organizationName: string
  campaignUrl: string
  subject: string
  message: string
}): Promise<{ failedIndexes: number[]; error: string | null }> {
  if (input.recipients.length === 0) return { failedIndexes: [], error: null }
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return {
      failedIndexes: input.recipients.map((_, index) => index),
      error: 'RESEND_API_KEY is not configured',
    }
  }

  try {
    const result = await new Resend(apiKey).batch.send(input.recipients.map((recipient) => {
      const recipientGreeting = recipient.recipientName
        ? `Bonjour ${escapeHtml(recipient.recipientName)},`
        : 'Bonjour,'
      return {
        from: process.env.RESEND_FROM || 'no-reply@studio.test',
        to: recipient.to,
        subject: input.subject,
        html: [
          '<div style="margin:0;padding:32px 16px;background:#FAF9F6;color:#2D2424;font-family:Arial,Helvetica,sans-serif;line-height:1.6">',
          '<div style="max-width:600px;margin:0 auto;overflow:hidden;border:1px solid #EAE3E1;border-radius:16px;background:#FFFFFF">',
          '<div style="padding:24px;background:#2D2424;text-align:center">',
          '<p style="margin:0;color:#D4A3A1;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Recette produit</p>',
          '<h1 style="margin:8px 0 0;color:#FFFFFF;font-size:24px">Une campagne vous attend</h1>',
          '</div>',
          '<div style="padding:28px 24px">',
          `<p style="margin:0 0 16px;font-size:16px">${recipientGreeting}</p>`,
          ...(input.message ? [`<p style="margin:0 0 20px;white-space:pre-wrap">${escapeHtml(input.message)}</p>`] : []),
          '<div style="margin:20px 0;padding:16px;border-left:4px solid #D4A3A1;border-radius:8px;background:#FAF9F6">',
          `<p style="margin:0 0 6px"><strong>Campagne :</strong> ${escapeHtml(input.campaignName)}</p>`,
          `<p style="margin:0"><strong>Organisation :</strong> ${escapeHtml(input.organizationName)}</p>`,
          '</div>',
          '<div style="margin:28px 0;text-align:center">',
          `<a href="${escapeHtml(input.campaignUrl)}" style="display:inline-block;border-radius:8px;background:#D4A3A1;padding:13px 22px;color:#2D2424;font-weight:700;text-decoration:none">Découvrir les scénarios</a>`,
          '</div>',
          '<p style="margin:0;color:#6B625F;font-size:13px">Les réponses sont anonymes et ne nécessitent pas de connexion.</p>',
          '</div>',
          '</div>',
          '<p style="margin:16px auto 0;max-width:600px;color:#948B89;text-align:center;font-size:12px">Invitation à une campagne de recette</p>',
          '</div>',
        ].join(''),
      }
    }), { batchValidation: 'permissive' })

    if (result.error) {
      return {
        failedIndexes: input.recipients.map((_, index) => index),
        error: `Resend failed to send test campaign invitations: ${result.error.message}`,
      }
    }
    return { failedIndexes: result.data.errors.map(({ index }) => index), error: null }
  } catch (cause: unknown) {
    return {
      failedIndexes: input.recipients.map((_, index) => index),
      error: cause instanceof Error
        ? cause.message
        : 'Unknown error while sending test campaign invitations',
    }
  }
}

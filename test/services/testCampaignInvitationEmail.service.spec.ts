import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ batchSend: vi.fn() }))

vi.mock('resend', () => ({
  Resend: vi.fn(function MockResend() {
    return { batch: { send: mocks.batchSend } }
  }),
}))

import { sendTestCampaignInvitationEmails } from '@/services/testCampaignInvitationEmail.service'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('test campaign invitation email', () => {
  beforeEach(() => {
    vi.stubEnv('RESEND_API_KEY', 'test-api-key')
    vi.stubEnv('RESEND_FROM', 'recette@example.test')
    mocks.batchSend.mockResolvedValue({
      data: { data: [{ id: 'email-1' }], errors: [] },
      error: null,
    })
  })

  it('sends escaped public-link invitations in one batch', async () => {
    const delivery = await sendTestCampaignInvitationEmails({
      recipients: [{
        to: 'camille@example.test',
        recipientName: 'Camille <script>',
      }],
      campaignName: 'Recette réservation',
      organizationName: 'Osez & Vous',
      campaignUrl: 'https://example.test/retour-test/token?a=1&b=2',
      subject: 'Recette des rendez-vous',
      message: 'Merci de tester le parcours <réservation>.',
    })

    expect(mocks.batchSend).toHaveBeenCalledWith([{
      from: 'recette@example.test',
      to: 'camille@example.test',
      subject: 'Recette des rendez-vous',
      html: expect.stringContaining('https://example.test/retour-test/token?a=1&amp;b=2'),
    }], { batchValidation: 'permissive' })
    expect(mocks.batchSend.mock.calls[0][0][0].html).toContain('Camille &lt;script&gt;')
    expect(mocks.batchSend.mock.calls[0][0][0].html).toContain('Osez &amp; Vous')
    expect(mocks.batchSend.mock.calls[0][0][0].html).toContain('Merci de tester le parcours &lt;réservation&gt;.')
    expect(mocks.batchSend.mock.calls[0][0][0].html).toContain('background:#FAF9F6')
    expect(mocks.batchSend.mock.calls[0][0][0].html).toContain('Découvrir les scénarios')
    expect(delivery).toEqual({ failedIndexes: [], error: null })
  })

  it('reports missing email configuration as a delivery failure', async () => {
    vi.stubEnv('RESEND_API_KEY', '')

    await expect(sendTestCampaignInvitationEmails({
      recipients: [{ to: 'camille@example.test', recipientName: null }],
      campaignName: 'Recette',
      organizationName: 'Osez le T’re',
      campaignUrl: 'https://example.test/retour-test/token',
      subject: 'Invitation à la campagne de recette',
      message: 'Vous êtes invité(e) à participer à la campagne de recette.',
    })).resolves.toEqual({
      failedIndexes: [0],
      error: 'RESEND_API_KEY is not configured',
    })
  })

  it('reports partial delivery failures by recipient index', async () => {
    mocks.batchSend.mockResolvedValueOnce({
      data: {
        data: [{ id: 'email-1' }],
        errors: [{ index: 1, message: 'Recipient rejected' }],
      },
      error: null,
    })

    const delivery = await sendTestCampaignInvitationEmails({
      recipients: [
        { to: 'first@example.test', recipientName: null },
        { to: 'second@example.test', recipientName: null },
      ],
      campaignName: 'Recette',
      organizationName: 'Osez le T’re',
      campaignUrl: 'https://example.test/retour-test/token',
      subject: 'Invitation à la campagne de recette',
      message: 'Vous êtes invité(e) à participer à la campagne de recette.',
    })

    expect(delivery).toEqual({ failedIndexes: [1], error: null })
  })

  it('reports a batch-level delivery error for all selected recipients', async () => {
    mocks.batchSend.mockResolvedValueOnce({
      data: null,
      error: { message: 'Recipient rejected' },
    })

    await expect(sendTestCampaignInvitationEmails({
      recipients: [{ to: 'camille@example.test', recipientName: null }],
      campaignName: 'Recette',
      organizationName: 'Osez le T’re',
      campaignUrl: 'https://example.test/retour-test/token',
      subject: 'Invitation à la campagne de recette',
      message: 'Vous êtes invité(e) à participer à la campagne de recette.',
    })).resolves.toEqual({
      failedIndexes: [0],
      error: 'Resend failed to send test campaign invitations: Recipient rejected',
    })
  })
})

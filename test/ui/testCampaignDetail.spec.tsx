import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import TestCampaignDetail from '@/components/test-feedback/TestCampaignDetail'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('TestCampaignDetail', () => {
  it('shows campaign-level anonymous feedback with readable answer labels', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      campaign: {
        id: 'campaign-1',
        name: 'Recette réservation',
        scenarioGroups: ['ONLINE_BOOKING'],
        profiles: ['USER'],
        status: 'ACTIVE',
        publicToken: 'public-token',
        createdAt: '2026-10-04T09:00:00.000Z',
        closedAt: null,
        organizationName: 'Osez le T’re',
      },
      progress: {
        total: 10,
        tested: 0,
        passed: 0,
        failed: 0,
        blocked: 0,
        remaining: 10,
        currentResults: [],
      },
      scenarios: [],
      history: [],
      campaignReviews: [{
        id: 'review-1',
        profile: 'USER',
        clarity: 'MOSTLY_CLEAR',
        duration: 'ABOUT_RIGHT',
        links: 'VERY_USEFUL',
        satisfaction: 'SATISFIED',
        comment: 'Les liens directs m’ont aidé.',
        createdAt: '2026-10-04T09:30:00.000Z',
      }],
    }), { status: 200 })))

    render(<TestCampaignDetail campaignId="campaign-1" />)

    expect(await screen.findByRole('heading', { name: 'Avis général des testeurs' })).toBeInTheDocument()
    expect(screen.getByText('Plutôt compréhensibles')).toBeInTheDocument()
    expect(screen.getByText('Adaptée')).toBeInTheDocument()
    expect(screen.getByText('Oui, très utiles')).toBeInTheDocument()
    expect(screen.getByText('Plutôt satisfaisante')).toBeInTheDocument()
    expect(screen.getByText('Les liens directs m’ont aidé.')).toBeInTheDocument()
  })

  it('downloads the current campaign feedback as a JSON file', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      campaign: {
        id: 'campaign-1',
        name: 'Recette réservation',
        scenarioGroups: ['ONLINE_BOOKING'],
        profiles: ['USER'],
        status: 'ACTIVE',
        publicToken: 'public-token',
        createdAt: '2026-10-04T09:00:00.000Z',
        closedAt: null,
        organizationName: 'Osez le T’re',
      },
      progress: {
        total: 0,
        tested: 0,
        passed: 0,
        failed: 0,
        blocked: 0,
        remaining: 0,
        currentResults: [],
      },
      scenarios: [],
      history: [],
      campaignReviews: [],
    }), { status: 200 })))
    const createObjectURL = vi.fn(() => 'blob:campaign-export')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
    const clickedLinks: HTMLAnchorElement[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function captureClick(this: HTMLAnchorElement) {
      clickedLinks.push(this)
    })

    render(<TestCampaignDetail campaignId="campaign-1" />)

    fireEvent.click(await screen.findByRole('button', { name: 'Télécharger les retours (JSON)' }))

    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    expect(clickedLinks).toHaveLength(1)
    expect(clickedLinks[0].download).toMatch(/^recette-reservation-\d{4}-\d{2}-\d{2}\.json$/)
    expect(clickedLinks[0].href).toBe('blob:campaign-export')
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:campaign-export')
  })
})

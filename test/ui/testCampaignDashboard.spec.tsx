import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import TestCampaignDashboard from '@/components/test-feedback/TestCampaignDashboard'

const emptyDashboard = {
  organizations: [{ id: 'org-1', name: 'Osez le T’re' }],
  campaigns: [],
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('TestCampaignDashboard', () => {
  it('creates a campaign from multiple scenario groups without requesting a commit', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(emptyDashboard), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'campaign-1' }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(emptyDashboard), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    render(<TestCampaignDashboard />)
    await screen.findByText(/Aucune campagne/)

    fireEvent.change(screen.getByLabelText('Nom de la campagne'), {
      target: { value: 'Recette réservation complète' },
    })
    fireEvent.change(screen.getByLabelText('Organisation'), {
      target: { value: 'org-1' },
    })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Administration' }))
    fireEvent.click(screen.getByRole('button', { name: 'Créer la campagne' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))
    const createRequest = fetchMock.mock.calls[1][1]
    expect(JSON.parse(String(createRequest?.body))).toEqual({
      name: 'Recette réservation complète',
      organizationId: 'org-1',
      profiles: ['USER'],
      scenarioGroups: ['ONLINE_BOOKING', 'APPOINTMENTS_AND_CHANGES', 'SECURITY_AND_MOBILE'],
    })
    expect(screen.queryByLabelText('Build ou commit testé')).not.toBeInTheDocument()
  })
})

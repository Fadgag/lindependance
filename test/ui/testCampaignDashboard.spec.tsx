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
      .mockResolvedValueOnce(new Response(JSON.stringify([{
        id: 'user-1',
        name: 'Camille',
        email: 'camille@example.test',
        role: 'USER',
      }]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: 'campaign-1',
        name: 'Recette réservation complète',
        publicToken: 'a'.repeat(43),
        invitations: { sent: 1, failedRecipients: [], deliveryError: null },
      }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(emptyDashboard), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    render(<TestCampaignDashboard />)
    await screen.findByText(/Aucune campagne/)
    fireEvent.click(await screen.findByRole('checkbox', { name: /Camille \(camille@example\.test\)/ }))

    fireEvent.change(screen.getByLabelText('Nom de la campagne'), {
      target: { value: 'Recette réservation complète' },
    })
    fireEvent.change(screen.getByLabelText('Organisation'), {
      target: { value: 'org-1' },
    })
    fireEvent.change(screen.getByLabelText('Objet de l’e-mail'), {
      target: { value: 'Testez la réservation' },
    })
    fireEvent.change(screen.getByLabelText(/Message personnalisé/), {
      target: { value: 'Merci de vérifier le parcours de réservation.' },
    })
    const scenarioGroup = screen.getByRole('group', { name: 'Parcours à tester' })
    const createButton = screen.getByRole('button', { name: 'Créer la campagne' })
    expect(createButton.parentElement).toContainElement(scenarioGroup)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Administration' }))
    fireEvent.click(createButton)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4))
    const createRequest = fetchMock.mock.calls[2][1]
    expect(JSON.parse(String(createRequest?.body))).toEqual({
      name: 'Recette réservation complète',
      organizationId: 'org-1',
      profiles: ['USER'],
      scenarioGroups: ['ONLINE_BOOKING', 'APPOINTMENTS_AND_CHANGES', 'SECURITY_AND_MOBILE'],
      recipientIds: ['user-1'],
      emailSubject: 'Testez la réservation',
      emailMessage: 'Merci de vérifier le parcours de réservation.',
    })
    expect(screen.queryByLabelText('Build ou commit testé')).not.toBeInTheDocument()
    expect(await screen.findByText('La campagne a été créée. 1 invitation envoyée sur 1.')).toBeInTheDocument()
  })
})

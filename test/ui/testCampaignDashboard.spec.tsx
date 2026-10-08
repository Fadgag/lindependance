import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import TestCampaignDashboard from '@/components/test-feedback/TestCampaignDashboard'

const domainSelection = vi.hoisted(() => ({ ids: ['org-1'] as string[] }))

vi.mock('@/components/layout/TechAdminDomainProvider', () => ({
  useTechAdminDomain: () => ({ selectedOrganizationIds: domainSelection.ids }),
}))

const emptyDashboard = {
  organizations: [
    { id: 'org-1', name: 'Osez le T’re' },
    { id: 'org-2', name: 'Salon B' },
  ],
  campaigns: [],
}

afterEach(() => {
  vi.unstubAllGlobals()
  domainSelection.ids = ['org-1']
})

describe('TestCampaignDashboard', () => {
  it('creates a campaign from multiple scenario groups without requesting a commit', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(emptyDashboard), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{
        id: 'user-1',
        name: 'Camille',
        email: 'camille@example.test',
        source: 'USER',
        role: 'USER',
      }, {
        id: 'customer-1',
        name: 'Léa Martin',
        email: 'lea@example.test',
        source: 'CUSTOMER',
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
    fireEvent.click(await screen.findByRole('checkbox', { name: /Léa Martin \(lea@example\.test\)/ }))

    const campaignNameInput = screen.getByLabelText('Nom de la campagne')
    fireEvent.change(campaignNameInput, {
      target: { value: 'Recette réservation complète' },
    })
    const enterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    })
    campaignNameInput.dispatchEvent(enterEvent)
    expect(enterEvent.defaultPrevented).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(screen.getByLabelText('Organisation')).toHaveValue('org-1')
    fireEvent.change(screen.getByLabelText('Objet de l’e-mail'), {
      target: { value: 'Testez la réservation' },
    })
    fireEvent.change(screen.getByLabelText(/Message personnalisé/), {
      target: { value: 'Merci de vérifier le parcours de réservation.' },
    })
    const scenarioGroup = screen.getByRole('group', { name: 'Parcours à tester' })
    const [desktopCreateButton, mobileCreateButton] = screen.getAllByRole('button', {
      name: 'Créer la campagne',
    })
    expect(desktopCreateButton.parentElement).toHaveClass('hidden', 'md:flex')
    expect(desktopCreateButton).toHaveClass('bg-studio-primary', 'text-white')
    expect(mobileCreateButton).toHaveClass('fixed', 'left-4', 'right-24', 'md:hidden', 'bg-studio-primary', 'text-white')
    expect(mobileCreateButton.parentElement).toHaveClass('grid')
    expect(mobileCreateButton.closest('form')).toContainElement(scenarioGroup)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Administration' }))
    fireEvent.click(mobileCreateButton)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4))
    const createRequest = fetchMock.mock.calls[2][1]
    expect(JSON.parse(String(createRequest?.body))).toEqual({
      name: 'Recette réservation complète',
      organizationId: 'org-1',
      profiles: ['USER'],
      scenarioGroups: ['ONLINE_BOOKING', 'APPOINTMENTS_AND_CHANGES', 'SECURITY_AND_MOBILE'],
      recipientIds: [{ source: 'CUSTOMER', id: 'customer-1' }],
      emailSubject: 'Testez la réservation',
      emailMessage: 'Merci de vérifier le parcours de réservation.',
    })
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/test-campaigns?organizationId=org-1')
    expect(screen.queryByLabelText('Build ou commit testé')).not.toBeInTheDocument()
    expect(await screen.findByText('La campagne a été créée. 1 invitation envoyée sur 1.')).toBeInTheDocument()
  })

  it('requires an explicit organization when multiple domains are selected', async () => {
    domainSelection.ids = ['org-1', 'org-2']
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(emptyDashboard), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    render(<TestCampaignDashboard />)

    await screen.findByText(/Aucune campagne/)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/test-campaigns?organizationId=org-1&organizationId=org-2')
    expect(screen.getByLabelText('Organisation')).toHaveValue('')
    expect(screen.getByRole('option', { name: 'Salon B' })).toBeInTheDocument()
  })

  it('requires an explicit organization in the global view', async () => {
    domainSelection.ids = []
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify(emptyDashboard), { status: 200 }),
    ))

    render(<TestCampaignDashboard />)

    await screen.findByText(/Aucune campagne/)
    expect(screen.getByLabelText('Organisation')).toHaveValue('')
  })
})

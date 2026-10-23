import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import InitialOrganizationAdminCard from '@/components/test-admin/InitialOrganizationAdminCard'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('InitialOrganizationAdminCard', () => {
  it('shows only salons without an ADMIN and creates the first passwordless ADMIN invitation', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([
        { id: 'org-1', name: 'Salon sans ADMIN', hasAdmin: false },
        { id: 'org-2', name: 'Salon déjà géré', hasAdmin: true },
      ]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        organization: { id: 'org-1', name: 'Salon sans ADMIN' },
        account: { id: 'admin-1', email: 'admin@example.test', role: 'ADMIN' },
        invitation: { sent: true, error: null },
      }), { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)

    render(<InitialOrganizationAdminCard />)
    expect(await screen.findByRole('option', { name: 'Salon sans ADMIN' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Salon déjà géré' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', {
      name: 'Créer le premier ADMIN et envoyer l’invitation',
    })).toHaveClass('bg-studio-primary', 'text-studio-text')
    fireEvent.change(screen.getByLabelText('Adresse e-mail du premier ADMIN'), {
      target: { value: 'admin@example.test' },
    })
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', {
      name: 'Créer le premier ADMIN et envoyer l’invitation',
    }))

    expect(await screen.findByText(/Le compte ADMIN de Salon sans ADMIN a été créé/)).toBeInTheDocument()
    expect(screen.getByText(/Le lien d’activation a été envoyé/)).toBeInTheDocument()
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/tech-admin/organizations/org-1/admin', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@example.test',
        confirmControlledEmail: true,
      }),
    }))
  })
})

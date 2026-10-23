import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import OrganizationAccountManager from '@/components/settings/OrganizationAccountManager'
import { OrganizationAccountsSchema } from '@/schemas/userAccounts'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('OrganizationAccountManager', () => {
  it('lists scoped account status and sends an invitation without a password', async () => {
    const accounts = OrganizationAccountsSchema.parse([
      {
        id: 'admin-1',
        name: 'Salon admin',
        email: 'admin@example.test',
        role: 'ADMIN',
        activationStatus: 'ACTIVE',
      },
      {
        id: 'user-1',
        name: null,
        email: 'staff@example.test',
        role: 'USER',
        activationStatus: 'PENDING',
      },
    ])
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        account: {
          id: 'user-2',
          name: 'New staff',
          email: 'new@example.test',
          role: 'USER',
        },
        invitation: { sent: true, error: null },
      }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(accounts), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    render(<OrganizationAccountManager actorId="admin-1" initialAccounts={accounts} />)
    expect(await screen.findByText('staff@example.test')).toBeInTheDocument()
    expect(screen.getByText('En attente d’activation')).toBeInTheDocument()
    expect(screen.getByText('Votre compte ne peut pas être modifié ici.')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Adresse e-mail'), {
      target: { value: 'new@example.test' },
    })
    fireEvent.change(screen.getByLabelText('Nom (facultatif)'), {
      target: { value: 'New staff' },
    })
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Créer le compte et envoyer l’invitation' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Invitation envoyée à new@example.test')
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/users', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        email: 'new@example.test',
        name: 'New staff',
        role: 'USER',
        confirmControlledEmail: true,
      }),
    }))
    expect(fetchMock.mock.calls[0][1].body).not.toContain('password')
  })
})

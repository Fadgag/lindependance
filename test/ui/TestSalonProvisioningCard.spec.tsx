import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import TestSalonProvisioningCard from '@/components/test-admin/TestSalonProvisioningCard'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('TestSalonProvisioningCard', () => {
  it('shows the created portal and synthetic customer details', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: 'org-test',
      name: 'Salon de test salon-test-abc',
      slug: 'salon-test-abc',
      customerEmail: 'client-salon-test-abc@example.invalid',
      staffAccount: { email: 'staff@example.test', role: 'USER' },
      invitation: { sent: true, error: null },
    }), { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)

    render(<TestSalonProvisioningCard />)
    fireEvent.change(screen.getByLabelText('Adresse e-mail du compte staff'), {
      target: { value: 'staff@example.test' },
    })
    fireEvent.click(screen.getByRole('checkbox', {
      name: /je confirme que cette adresse est une boîte de test sous mon contrôle/i,
    }))
    fireEvent.click(screen.getByRole('button', { name: 'Créer le salon et envoyer l’activation' }))

    expect(await screen.findByText('Salon de test salon-test-abc')).toBeInTheDocument()
    expect(screen.getByText('salon-test-abc')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ouvrir le portail client' }))
      .toHaveAttribute('href', '/portail/salon-test-abc/reserver')
    expect(screen.getByText('client-salon-test-abc@example.invalid')).toBeInTheDocument()
    expect(screen.getByText('staff@example.test')).toBeInTheDocument()
    expect(screen.getByText('Compte staff · USER')).toBeInTheDocument()
    expect(screen.getByText(/E-mail d’activation envoyé/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Créer le salon et envoyer l’activation' }))
      .toBeDisabled()
    expect(fetchMock).toHaveBeenCalledWith('/api/tech-admin/test-salons', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        email: 'staff@example.test',
        role: 'USER',
        confirmControlledEmail: true,
      }),
    }))
  })

  it('requires email and mailbox-control confirmation before provisioning', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    render(<TestSalonProvisioningCard />)

    const createButton = screen.getByRole('button', { name: 'Créer le salon et envoyer l’activation' })
    expect(createButton).toBeDisabled()
    expect(createButton).toHaveClass('bg-studio-primary', 'text-studio-text')
    fireEvent.change(screen.getByLabelText('Adresse e-mail du compte staff'), {
      target: { value: 'staff@example.test' },
    })
    expect(screen.getByRole('button', { name: 'Créer le salon et envoyer l’activation' }))
      .toBeDisabled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('sends ADMIN only when explicitly selected', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: 'org-test',
      name: 'Salon de test salon-test-admin',
      slug: 'salon-test-admin',
      customerEmail: 'client-salon-test-admin@example.invalid',
      staffAccount: { email: 'admin@example.test', role: 'ADMIN' },
      invitation: { sent: true, error: null },
    }), { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)

    render(<TestSalonProvisioningCard />)
    fireEvent.change(screen.getByLabelText('Adresse e-mail du compte staff'), {
      target: { value: 'admin@example.test' },
    })
    fireEvent.change(screen.getByLabelText('Rôle du compte'), {
      target: { value: 'ADMIN' },
    })
    fireEvent.click(screen.getByRole('checkbox', {
      name: /je confirme que cette adresse est une boîte de test sous mon contrôle/i,
    }))
    fireEvent.click(screen.getByRole('button', { name: 'Créer le salon et envoyer l’activation' }))

    expect(await screen.findByText('Compte staff · ADMIN')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/tech-admin/test-salons', expect.objectContaining({
      body: JSON.stringify({
        email: 'admin@example.test',
        role: 'ADMIN',
        confirmControlledEmail: true,
      }),
    }))
  })

  it('shows a clear delivery error without hiding the created account', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: 'org-test',
      name: 'Salon de test salon-test-abc',
      slug: 'salon-test-abc',
      customerEmail: 'client-salon-test-abc@example.invalid',
      staffAccount: { email: 'staff@example.test', role: 'USER' },
      invitation: {
        sent: false,
        error: 'Le compte est créé, mais l’envoi de l’e-mail d’activation a échoué ou n’a pas pu être confirmé.',
      },
    }), { status: 201 })))

    render(<TestSalonProvisioningCard />)
    fireEvent.change(screen.getByLabelText('Adresse e-mail du compte staff'), {
      target: { value: 'staff@example.test' },
    })
    fireEvent.click(screen.getByRole('checkbox', {
      name: /je confirme que cette adresse est une boîte de test sous mon contrôle/i,
    }))
    fireEvent.click(screen.getByRole('button', { name: 'Créer le salon et envoyer l’activation' }))

    expect(await screen.findByText('Salon de test salon-test-abc')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('l’envoi de l’e-mail d’activation a échoué ou n’a pas pu être confirmé.')
    expect(screen.getByText('staff@example.test')).toBeInTheDocument()
  })

  it('shows API creation failures clearly', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: 'La création a échoué.',
    }), { status: 500 })))

    render(<TestSalonProvisioningCard />)
    fireEvent.change(screen.getByLabelText('Adresse e-mail du compte staff'), {
      target: { value: 'staff@example.test' },
    })
    fireEvent.click(screen.getByRole('checkbox', {
      name: /je confirme que cette adresse est une boîte de test sous mon contrôle/i,
    }))
    fireEvent.click(screen.getByRole('button', { name: 'Créer le salon et envoyer l’activation' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('La création a échoué.')
  })
})

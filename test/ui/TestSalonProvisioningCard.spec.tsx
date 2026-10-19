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
    }), { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)

    render(<TestSalonProvisioningCard />)
    fireEvent.click(screen.getByRole('button', { name: 'Créer un salon de test' }))

    expect(await screen.findByText('Salon de test salon-test-abc')).toBeInTheDocument()
    expect(screen.getByText('salon-test-abc')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ouvrir le portail client' }))
      .toHaveAttribute('href', '/portail/salon-test-abc/reserver')
    expect(screen.getByText('client-salon-test-abc@example.invalid')).toBeInTheDocument()
    expect(screen.getByText(/Aucune invitation ni aucun e-mail n’a été envoyé/)).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/tech-admin/test-salons', expect.objectContaining({
      method: 'POST',
      body: '{}',
    }))
  })

  it('shows API creation failures clearly', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: 'La création a échoué.',
    }), { status: 500 })))

    render(<TestSalonProvisioningCard />)
    fireEvent.click(screen.getByRole('button', { name: 'Créer un salon de test' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('La création a échoué.')
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import CustomerModal from '@/components/customers/CustomerModal'
import UnavailabilityModal from '@/components/calendar/UnavailabilityModal'
import PractitionerManager from '@/components/settings/PractitionerManager'

vi.mock('@/components/ui/BaseModal', () => ({
  default: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div role="dialog" aria-label={title}>{children}</div>
  ),
}))

vi.mock('@/components/ui/ConfirmDialog', () => ({ default: () => null }))
vi.mock('@/lib/toast', () => ({ showToast: vi.fn() }))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn() } }))

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('interface wording', () => {
  it('uses neutral wording in the customer creation form', () => {
    render(<CustomerModal isOpen onCloseAction={vi.fn()} onCreatedAction={vi.fn()} />)

    expect(screen.getByRole('dialog', { name: 'Nouveau client' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Créer le client' })).toBeInTheDocument()
    expect(screen.queryByText(/cliente/i)).not.toBeInTheDocument()
  })

  it('replaces calendar jargon with everyday wording', () => {
    render(
      <UnavailabilityModal
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        initialStart={new Date('2026-10-06T09:00:00')}
        initialEnd={new Date('2026-10-06T10:00:00')}
      />,
    )

    expect(screen.getByText('Répéter')).toBeInTheDocument()
    expect(screen.queryByText('Récurrence')).not.toBeInTheDocument()
    expect(screen.queryByText(/occurrence/i)).not.toBeInTheDocument()
  })

  it('uses clear wording for managing the salon team', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify([{
      id: 'staff-1',
      firstName: 'Alex',
      lastName: 'Durand',
      active: true,
      title: 'Alex Durand',
    }]), { status: 200, headers: { 'Content-Type': 'application/json' } })))

    render(<PractitionerManager />)

    expect(await screen.findByRole('heading', { name: 'Ajouter une personne à l’équipe' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Équipe active' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retirer de l’équipe' })).toBeInTheDocument()
    expect(screen.queryByText(/praticien/i)).not.toBeInTheDocument()
  })
})

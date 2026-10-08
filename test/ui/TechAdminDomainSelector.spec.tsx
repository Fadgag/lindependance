import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import TechAdminDomainProvider, {
  useTechAdminDomain,
} from '@/components/layout/TechAdminDomainProvider'
import TechAdminDomainSelector from '@/components/layout/TechAdminDomainSelector'

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { role: 'TECH_ADMIN', accountType: 'STAFF' } },
    status: 'authenticated',
    update: vi.fn(),
  }),
}))

const organizations = [
  { id: 'org-1', name: 'Salon A' },
  { id: 'org-2', name: 'Salon B' },
]

function SelectedDomain() {
  const { selectedOrganizationIds } = useTechAdminDomain()
  return <p>Domaine actif : {selectedOrganizationIds.length ? selectedOrganizationIds.join(', ') : 'Tous les domaines'}</p>
}

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(organizations)))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('TechAdminDomainSelector', () => {
  it('shares multiple selected domains across consumers and stores them for later visits', async () => {
    render(
      <TechAdminDomainProvider>
        <TechAdminDomainSelector />
        <SelectedDomain />
      </TechAdminDomainProvider>,
    )

    fireEvent.click(await screen.findByText(/Domaines de travail : Tous les domaines/))
    const allDomains = screen.getByRole('checkbox', { name: 'Tous les domaines' })
    expect(allDomains).toBeChecked()
    expect(screen.getByText('Domaine actif : Tous les domaines')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Salon A' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Salon B' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('checkbox', { name: 'Salon A' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Salon B' }))

    expect(screen.getByText('Domaine actif : org-1, org-2')).toBeInTheDocument()
    expect(allDomains).not.toBeChecked()
    await waitFor(() => {
      expect(localStorage.getItem('tech-admin-selected-organization')).toBe('["org-1","org-2"]')
    })
  })

  it('restores a valid previously selected domain from the legacy storage format', async () => {
    localStorage.setItem('tech-admin-selected-organization', 'org-1')

    render(
      <TechAdminDomainProvider>
        <TechAdminDomainSelector />
      </TechAdminDomainProvider>,
    )

    fireEvent.click(await screen.findByText(/Domaines de travail : Salon A/))
    expect(screen.getByRole('checkbox', { name: 'Salon A' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Tous les domaines' })).not.toBeChecked()
  })

  it('restores multiple selected domains', async () => {
    localStorage.setItem('tech-admin-selected-organization', JSON.stringify(['org-1', 'org-2']))

    render(
      <TechAdminDomainProvider>
        <TechAdminDomainSelector />
        <SelectedDomain />
      </TechAdminDomainProvider>,
    )

    fireEvent.click(await screen.findByText(/Domaines de travail : Salon A, Salon B/))
    expect(screen.getByRole('checkbox', { name: 'Salon A' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Salon B' })).toBeChecked()
    expect(screen.getByText('Domaine actif : org-1, org-2')).toBeInTheDocument()
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { ModalStackProvider } from '@/components/ui/ModalStackProvider'

const mocks = vi.hoisted(() => ({
  useSession: vi.fn(),
  usePathname: vi.fn(),
  getRecentClientIssueErrors: vi.fn(),
}))

vi.mock('next-auth/react', () => ({ useSession: mocks.useSession }))
vi.mock('next/navigation', () => ({ usePathname: mocks.usePathname }))
vi.mock('@/lib/clientIssueErrors', () => ({
  getRecentClientIssueErrors: mocks.getRecentClientIssueErrors,
}))

import IssueReportLauncher from '@/components/issue-reports/IssueReportLauncher'

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(mocks.useSession).mockReturnValue({
    data: { user: { accountType: 'STAFF', name: 'Alex Durand' } },
    status: 'authenticated',
  })
  vi.mocked(mocks.usePathname).mockReturnValue('/agenda')
  vi.mocked(mocks.getRecentClientIssueErrors).mockReturnValue([
    { name: 'TypeError', message: 'Erreur récente expurgée' },
  ])
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('IssueReportLauncher', () => {
  it('explains the collected information and submits a report with recent diagnostics', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        reporterName: 'Alex Durand',
        reporterEmail: 'alex@example.test',
        organizationName: 'Salon A',
        appVersion: '0.1.0',
      }))
      .mockResolvedValueOnce(jsonResponse({ id: 'report-1' }, 201))
    vi.stubGlobal('fetch', fetchMock)

    render(<ModalStackProvider><IssueReportLauncher /></ModalStackProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Signaler un problème' }))

    expect(await screen.findByRole('dialog', { name: 'Signaler un problème' })).toBeInTheDocument()
    expect(screen.getByText(/Alex Durand/)).toBeInTheDocument()
    expect(screen.getByText(/alex@example\.test/)).toBeInTheDocument()
    expect(screen.getByText(/supprimés 90 jours après leur résolution/)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Titre'), { target: { value: 'La page se bloque' } })
    fireEvent.change(screen.getByLabelText('Que s’est-il passé ?'), {
      target: { value: 'La page ne répond plus après validation.' },
    })
    fireEvent.change(screen.getByLabelText('Étapes pour reproduire'), {
      target: { value: 'Ouvrir le portail puis valider le rendez-vous.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer le signalement' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/issue-reports/context')
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/issue-reports')
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({
      title: 'La page se bloque',
      description: 'La page ne répond plus après validation.',
      steps: 'Ouvrir le portail puis valider le rendez-vous.',
      pathname: '/agenda',
      errors: [{ name: 'TypeError', message: 'Erreur récente expurgée' }],
    })
    expect(await screen.findByText(/Votre signalement a été envoyé/)).toBeInTheDocument()
  })

  it('offers the report form in the customer appointments area', () => {
    vi.mocked(mocks.useSession).mockReturnValue({ data: null, status: 'unauthenticated' })
    vi.mocked(mocks.usePathname).mockReturnValue('/portail/salon-a/mes-rdv')
    vi.stubGlobal('fetch', vi.fn())

    render(<ModalStackProvider><IssueReportLauncher /></ModalStackProvider>)

    expect(screen.getByRole('button', { name: 'Signaler un problème' })).toBeInTheDocument()
  })

  it('does not offer reporting from the public booking page', () => {
    vi.mocked(mocks.useSession).mockReturnValue({ data: null, status: 'unauthenticated' })
    vi.mocked(mocks.usePathname).mockReturnValue('/portail/salon-a/reserver')

    render(<ModalStackProvider><IssueReportLauncher /></ModalStackProvider>)

    expect(screen.queryByRole('button', { name: 'Signaler un problème' })).not.toBeInTheDocument()
  })
})

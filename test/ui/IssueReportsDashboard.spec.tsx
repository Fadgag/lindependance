import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import IssueReportsDashboard from '@/components/issue-reports/IssueReportsDashboard'

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const report = {
  id: 'report-1',
  organizationName: 'Salon A',
  reporterType: 'CUSTOMER',
  reporterName: 'Camille Martin',
  reporterEmail: 'camille@example.test',
  title: 'Le portail se bloque',
  description: 'La page ne répond plus après validation.',
  steps: 'Ouvrir le portail puis valider le rendez-vous.',
  pathname: '/portail/salon-a/mes-rdv',
  appVersion: '0.1.0',
  errors: [{ name: 'TypeError', message: 'Erreur expurgée' }],
  status: 'NEW',
  createdAt: '2026-10-06T12:00:00.000Z',
  resolvedAt: null,
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('IssueReportsDashboard', () => {
  it('shows reporter details to the technical admin and updates a report status', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse([report]))
      .mockResolvedValueOnce(jsonResponse({ ...report, status: 'RESOLVED', resolvedAt: '2026-10-06T12:00:00.000Z' }))
    vi.stubGlobal('fetch', fetchMock)

    render(<IssueReportsDashboard />)

    expect(await screen.findByText('Le portail se bloque')).toBeInTheDocument()
    expect(screen.getByText(/camille@example\.test/)).toBeInTheDocument()
    expect(screen.getByText(/Salon A/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('État du signalement Le portail se bloque'), {
      target: { value: 'RESOLVED' },
    })

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/issue-reports/report-1')
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({ status: 'RESOLVED' })
    await waitFor(() => {
      expect(screen.getByLabelText('État du signalement Le portail se bloque')).toHaveValue('RESOLVED')
    })
  })

  it('shows a useful error when the report list cannot be loaded', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, 500)))

    render(<IssueReportsDashboard />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Impossible de charger les signalements.')
  })
})

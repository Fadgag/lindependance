import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import PortalAppointments from '@/components/customer-portal/PortalAppointments'

const appointments = {
  timezone: 'Europe/Paris',
  appointments: [{
    id: 'appointment-1',
    startTime: '2026-10-03T10:00:00.000Z',
    endTime: '2026-10-03T11:00:00.000Z',
    status: 'CONFIRMED',
    customer: { firstName: 'Camille', lastName: 'Martin' },
    service: { name: 'Coupe' },
    staff: { firstName: 'Alex', lastName: 'Durand' },
    canCancel: true,
  }, {
    id: 'appointment-2',
    startTime: '2026-10-02T09:00:00.000Z',
    endTime: '2026-10-02T10:00:00.000Z',
    status: 'CONFIRMED',
    customer: { firstName: 'Noé', lastName: 'Martin' },
    service: { name: 'Coloration' },
    staff: null,
    canCancel: false,
  }],
}

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(appointments)))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('PortalAppointments', () => {
  it('lists family appointments in the organization timezone and directs late cancellations to staff', async () => {
    render(<PortalAppointments organizationSlug="atelier" organizationTimezone="Europe/Paris" />)

    expect(await screen.findByText('Camille Martin')).toBeInTheDocument()
    expect(screen.getByText('Noé Martin')).toBeInTheDocument()
    expect(screen.getByText('Coupe')).toBeInTheDocument()
    expect(screen.getByText('Praticien : Alex Durand')).toBeInTheDocument()
    expect(screen.getByText('Contactez votre établissement pour modifier ou annuler ce rendez-vous.')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Annuler' })).toHaveLength(1)
  })

  it('removes the appointment after a successful cancellation', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(response(appointments))
    fetchMock.mockResolvedValueOnce(response({ ok: true }))

    render(<PortalAppointments organizationSlug="atelier" organizationTimezone="Europe/Paris" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Annuler' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/portail/rdv/appointment-1', expect.objectContaining({
        method: 'DELETE',
        credentials: 'include',
      }))
    })
    await waitFor(() => {
      expect(screen.queryByText('Camille Martin')).not.toBeInTheDocument()
    })
  })

  it('prompts unauthenticated visitors to verify their email before viewing appointments', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response({ error: 'Unauthorized' }, 401))

    render(<PortalAppointments organizationSlug="atelier" organizationTimezone="Europe/Paris" />)

    expect(await screen.findByText('Identifiez-vous pour consulter vos rendez-vous.')).toBeInTheDocument()
  })
})

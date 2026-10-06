import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import PortalAppointments from '@/components/customer-portal/PortalAppointments'

const futureAppointmentStart = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
const requestedSlotStart = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
requestedSlotStart.setUTCHours(8, 30, 0, 0)
const requestedSlotLabel = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  hour: '2-digit',
  minute: '2-digit',
}).format(requestedSlotStart)

const appointments = {
  timezone: 'Europe/Paris',
  appointments: [{
    id: 'appointment-1',
    startTime: futureAppointmentStart.toISOString(),
    endTime: new Date(futureAppointmentStart.getTime() + 60 * 60 * 1000).toISOString(),
    status: 'CONFIRMED',
    serviceId: 'service-1',
    staffId: 'staff-1',
    customer: { firstName: 'Camille', lastName: 'Martin' },
    service: { name: 'Coupe' },
    staff: { firstName: 'Alex', lastName: 'Durand' },
    canCancel: true,
    changeRequest: null,
  }, {
    id: 'appointment-2',
    startTime: '2026-10-02T09:00:00.000Z',
    endTime: '2026-10-02T10:00:00.000Z',
    status: 'CONFIRMED',
    serviceId: 'service-2',
    staffId: null,
    customer: { firstName: 'Noé', lastName: 'Martin' },
    service: { name: 'Coloration' },
    staff: null,
    canCancel: false,
    changeRequest: null,
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
    expect(screen.getByText('Avec Alex Durand')).toBeInTheDocument()
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

  it('does not offer a change request for a paid appointment', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response({
      ...appointments,
      appointments: [
        { ...appointments.appointments[0], status: 'PAID' },
        appointments.appointments[1],
      ],
    }))

    render(<PortalAppointments organizationSlug="atelier" organizationTimezone="Europe/Paris" />)

    expect(await screen.findByText('Payé')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Demander un changement' })).not.toBeInTheDocument()
  })

  it('lets a customer open a timezone-aware request form for an appointment with a practitioner', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(response(appointments))
    fetchMock.mockResolvedValueOnce(response({
      timezone: 'Europe/Paris',
      slots: [{
        start: requestedSlotStart.toISOString(),
        end: new Date(requestedSlotStart.getTime() + 60 * 60 * 1000).toISOString(),
      }],
    }))
    fetchMock.mockResolvedValueOnce(response({ id: 'change-request-1', status: 'PENDING' }, 201))

    render(<PortalAppointments organizationSlug="atelier" organizationTimezone="Europe/Paris" />)

    expect(await screen.findByText('Camille Martin')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Demander un changement' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Demander un changement' })).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: 'Demander un changement' }))
    expect(await screen.findByTestId('appointment-change-form')).toBeInTheDocument()
    expect(screen.getByLabelText('Nouvelle date souhaitée')).toBeInTheDocument()
    expect(screen.getByLabelText('Motif (facultatif)')).toBeInTheDocument()

    fireEvent.click(await screen.findByRole('button', { name: requestedSlotLabel }))
    fireEvent.change(screen.getByLabelText('Motif (facultatif)'), {
      target: { value: 'Un imprévu' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer la demande' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/portail/rdv/appointment-1/demande-modification',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            requestedStart: requestedSlotStart.toISOString(),
            reason: 'Un imprévu',
          }),
        }),
      )
    })
    expect(await screen.findByText('En attente de validation')).toBeInTheDocument()
  })
})

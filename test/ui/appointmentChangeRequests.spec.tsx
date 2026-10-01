import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import AppointmentChangeRequests from '@/components/AppointmentChangeRequests'

const requestList = {
  timezone: 'Europe/Paris',
  requests: [{
    id: 'request-1',
    requestedStart: '2026-10-04T08:30:00.000Z',
    requestedEnd: '2026-10-04T09:30:00.000Z',
    reason: 'Un imprévu',
    createdAt: '2026-10-01T08:00:00.000Z',
    appointment: {
      id: 'appointment-1',
      startTime: '2026-10-03T08:00:00.000Z',
      endTime: '2026-10-03T09:00:00.000Z',
      customer: { firstName: 'Camille', lastName: 'Martin' },
      service: { name: 'Coupe' },
      staff: { firstName: 'Alex', lastName: 'Durand' },
    },
  }],
}

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(requestList)))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('AppointmentChangeRequests', () => {
  it('lists pending requests and removes a request after a successful approval', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(response(requestList))
    fetchMock.mockResolvedValueOnce(response({ ok: true }))

    render(<AppointmentChangeRequests />)
    expect(await screen.findByText('Camille Martin')).toBeInTheDocument()
    expect(screen.getByText('Un imprévu', { exact: false })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Approuver' }))
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/appointments/change-requests/request-1/approve',
        expect.objectContaining({ method: 'POST', credentials: 'include' }),
      )
    })
    await waitFor(() => {
      expect(screen.queryByText('Camille Martin')).not.toBeInTheDocument()
    })
  })

  it('sends the staff rejection reason to the review endpoint', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(response(requestList))
    fetchMock.mockResolvedValueOnce(response({ ok: true }))

    render(<AppointmentChangeRequests />)
    expect(await screen.findByText('Camille Martin')).toBeInTheDocument()
    fireEvent.change(screen.getByTestId('change-request-review-reason'), {
      target: { value: 'Créneau non disponible' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Refuser' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/appointments/change-requests/request-1/reject',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ reviewReason: 'Créneau non disponible' }),
        }),
      )
    })
  })
})

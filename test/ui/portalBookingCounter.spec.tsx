import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import PortalBookingCounter from '@/components/customer-portal/PortalBookingCounter'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
    count: 3,
    pendingChangeRequests: 2,
  }), { status: 200 })))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('PortalBookingCounter', () => {
  it('shows both portal bookings and pending customer change requests', async () => {
    render(<PortalBookingCounter />)

    expect(await screen.findByText(/3 nouvelles réservations en ligne aujourd’hui/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '2 demandes en attente' })).toHaveAttribute('href', '/change-requests')
  })
})

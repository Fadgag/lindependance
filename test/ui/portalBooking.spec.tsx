import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import PortalBooking from '@/components/customer-portal/PortalBooking'

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation((input: RequestInfo | URL) => {
    const url = String(input)
    if (url.endsWith('/services')) return Promise.resolve(response([]))
    if (url.endsWith('/praticiens')) return Promise.resolve(response([]))
    if (url.endsWith('/customers')) return Promise.resolve(response({ error: 'Unauthorized' }, 401))
    return Promise.resolve(response({ timezone: 'Europe/Paris', slots: [] }))
  }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('PortalBooking', () => {
  it('offers a subtle link to the staff sign-in page', async () => {
    render(<PortalBooking organizationSlug="osezletre" organizationTimezone="Europe/Paris" />)

    expect(await screen.findByRole('link', { name: 'Accès équipe' })).toHaveAttribute('href', '/auth/signin')
  })
})

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
  it('shows the organization name and logo without linking to the public agenda', async () => {
    render(
      <PortalBooking
        organizationSlug="osezletre"
        organizationTimezone="Europe/Paris"
        organizationName="Salon Élise"
        logoDataUrl="data:image/png;base64,aGVsbG8="
        logoShape="circle"
        logoSize="large"
      />,
    )

    expect(await screen.findByText('Salon Élise')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Logo de Salon Élise' })).toHaveClass('size-16', 'rounded-full')
    expect(screen.queryByRole('link', { name: 'Voir l’agenda public' })).not.toBeInTheDocument()
  })

  it('offers a subtle link to the staff sign-in page', async () => {
    render(
      <PortalBooking
        organizationSlug="osezletre"
        organizationTimezone="Europe/Paris"
        organizationName="Salon Élise"
        logoDataUrl={null}
        logoShape="circle"
        logoSize="medium"
      />,
    )

    expect(await screen.findByText('Salon Élise')).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Accès équipe' })).toHaveAttribute('href', '/auth/signin')
  })
})

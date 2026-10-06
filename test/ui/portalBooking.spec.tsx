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
        portalContactPhone="01 23 45 67 89"
        portalContactEmail="contact@salon-elise.fr"
      />,
    )

    expect(await screen.findByText('Salon Élise')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Logo de Salon Élise' })).toHaveClass('size-16', 'rounded-full')
    expect(screen.queryByRole('link', { name: 'Voir l’agenda public' })).not.toBeInTheDocument()
    expect(await screen.findByRole('link', { name: '01 23 45 67 89' })).toHaveAttribute('href', 'tel:0123456789')
    expect(screen.getByRole('link', { name: 'contact@salon-elise.fr' })).toHaveAttribute('href', 'mailto:contact@salon-elise.fr')
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
        portalContactPhone={null}
        portalContactEmail="contact@salon-elise.fr"
      />,
    )

    expect(await screen.findByText('Salon Élise')).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Accès équipe' })).toHaveAttribute('href', '/auth/signin')
  })

  it('shows neutral help about contacting the salon without checking the submitted email', async () => {
    render(
      <PortalBooking
        organizationSlug="osezletre"
        organizationTimezone="Europe/Paris"
        organizationName="Salon Élise"
        logoDataUrl={null}
        logoShape="circle"
        logoSize="medium"
        portalContactPhone="01 23 45 67 89"
        portalContactEmail={null}
      />,
    )

    expect(await screen.findByText(/vous ne recevez pas de code/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '01 23 45 67 89' })).toHaveAttribute('href', 'tel:0123456789')
    expect(screen.queryByText(/aucune fiche client ne correspond/i)).not.toBeInTheDocument()
  })
})

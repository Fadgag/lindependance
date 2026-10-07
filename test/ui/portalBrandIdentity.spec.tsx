import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import PortalBrandIdentity from '@/components/customer-portal/PortalBrandIdentity'
import { DEFAULT_ORGANIZATION_BRANDING } from '@/domain/branding/logoSettings'

describe('PortalBrandIdentity', () => {
  it('renders the selected typography and caps the logo for a mobile preview', () => {
    render(
      <PortalBrandIdentity
        organizationName="Studio Étoile"
        branding={{
          ...DEFAULT_ORGANIZATION_BRANDING,
          logoDataUrl: 'data:image/webp;base64,AA==',
          logoShape: 'square',
          portalNameFont: 'notoSerif',
          portalNameSize: 22,
          portalNameColor: 'emerald',
          portalNameWeight: 'bold',
          portalNameAlignment: 'right',
          portalLogoSize: 160,
        }}
        viewport="mobile"
      />,
    )

    const name = screen.getByText('Studio Étoile')
    expect(name).toHaveStyle({
      color: '#047857',
      fontWeight: '700',
      textAlign: 'right',
    })
    expect(name).toHaveStyle({ fontFamily: 'var(--font-noto-serif), serif' })
    expect(screen.getByRole('img', { name: 'Logo de Studio Étoile' })).toBeInTheDocument()
    expect(screen.getByTestId('portal-brand-preview')).toHaveAttribute('data-logo-size', '128')
  })
})

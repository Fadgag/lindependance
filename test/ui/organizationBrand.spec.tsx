import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

const { sessionState, fetchMock } = vi.hoisted(() => ({
  sessionState: { current: null as null | { user: { organizationId: string } } },
  fetchMock: vi.fn<typeof fetch>(),
}))

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: sessionState.current, status: 'authenticated' }),
}))

import OrganizationBrand from '@/components/layout/OrganizationBrand'
import { resetOrganizationBrandingCache } from '@/hooks/useOrganizationBranding'

beforeEach(() => {
  resetOrganizationBrandingCache()
  sessionState.current = { user: { organizationId: 'org-1' } }
  fetchMock.mockReset()
  fetchMock.mockImplementation(async () => {
    const dataUrl = sessionState.current?.user.organizationId === 'org-1'
      ? 'data:image/webp;base64,AA=='
      : 'data:image/webp;base64,AQ=='
    return new Response(JSON.stringify({
      logoDataUrl: dataUrl,
      logoShape: 'circle',
      organizationName: sessionState.current?.user.organizationId === 'org-1' ? 'Salon 1' : 'Salon 2',
      showNameWithLogo: false,
    }), { status: 200 })
  })
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  resetOrganizationBrandingCache()
  vi.unstubAllGlobals()
})

describe('OrganizationBrand', () => {
  it('reloads branding when the signed-in organization changes', async () => {
    const view = render(<OrganizationBrand variant="mobile" />)
    const brandImage = await screen.findByRole('img', { name: 'Logo de l’organisation' })

    expect(brandImage.querySelector('img')).toHaveAttribute('src', 'data:image/webp;base64,AA==')

    sessionState.current = { user: { organizationId: 'org-2' } }
    view.rerender(<OrganizationBrand variant="mobile" />)

    await waitFor(() => {
      expect(screen.getByRole('img', { name: 'Logo de l’organisation' }).querySelector('img'))
        .toHaveAttribute('src', 'data:image/webp;base64,AQ==')
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('keeps the refreshed logo if an older request completes afterward', async () => {
    let completeInitialRequest: ((response: Response) => void) | undefined
    fetchMock.mockReset()
    fetchMock
      .mockImplementationOnce(() => new Promise((resolve) => { completeInitialRequest = resolve }))
      .mockImplementationOnce(async () => new Response(JSON.stringify({
        logoDataUrl: 'data:image/webp;base64,AQ==',
        logoShape: 'circle',
        organizationName: 'Salon 1',
        showNameWithLogo: false,
      }), { status: 200 }))

    render(<OrganizationBrand variant="mobile" />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    window.dispatchEvent(new Event('organization:branding-updated'))

    const brandImage = await screen.findByRole('img', { name: 'Logo de l’organisation' })
    await waitFor(() => {
      expect(brandImage.querySelector('img')).toHaveAttribute('src', 'data:image/webp;base64,AQ==')
    })

    completeInitialRequest?.(new Response(JSON.stringify({
      logoDataUrl: 'data:image/webp;base64,AA==',
      logoShape: 'circle',
      organizationName: 'Salon 1',
      showNameWithLogo: false,
    }), { status: 200 }))

    await waitFor(() => {
      expect(brandImage.querySelector('img')).toHaveAttribute('src', 'data:image/webp;base64,AQ==')
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('shows the organization name beside its logo when that preference is enabled', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      logoDataUrl: 'data:image/webp;base64,AA==',
      logoShape: 'circle',
      organizationName: 'Studio Étoile',
      showNameWithLogo: true,
    }), { status: 200 }))

    render(<OrganizationBrand variant="mobile" />)

    expect(await screen.findByText('Studio Étoile')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Logo de l’organisation' })).toBeInTheDocument()
  })
})

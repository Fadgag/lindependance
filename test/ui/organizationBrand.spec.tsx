import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'

const { sessionState, fetchMock } = vi.hoisted(() => ({
  sessionState: { current: null as null | { user: { organizationId: string } } },
  fetchMock: vi.fn<typeof fetch>(),
}))

let triggerResizeObserver: (() => void) | null = null

class TestResizeObserver implements ResizeObserver {
  root: Element | Document | null = null
  rootMargin = ''
  thresholds: readonly number[] = []

  constructor(private readonly callback: ResizeObserverCallback) {
    triggerResizeObserver = () => this.callback([], this)
  }

  observe(target: Element) {
    this.root = target
  }

  unobserve() {}

  disconnect() {
    triggerResizeObserver = null
  }

}

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: sessionState.current, status: 'authenticated' }),
}))

import OrganizationBrand from '@/components/layout/OrganizationBrand'
import { shouldStackOrganizationBrand } from '@/components/layout/organizationBrandLayout'
import { resetOrganizationBrandingCache } from '@/hooks/useOrganizationBranding'
import { DEFAULT_ORGANIZATION_BRANDING } from '@/domain/branding/logoSettings'

beforeEach(() => {
  triggerResizeObserver = null
  vi.stubGlobal('ResizeObserver', TestResizeObserver)
  resetOrganizationBrandingCache()
  sessionState.current = { user: { organizationId: 'org-1' } }
  fetchMock.mockReset()
  fetchMock.mockImplementation(async () => {
    const dataUrl = sessionState.current?.user.organizationId === 'org-1'
      ? 'data:image/webp;base64,AA=='
      : 'data:image/webp;base64,AQ=='
    return new Response(JSON.stringify({
      ...DEFAULT_ORGANIZATION_BRANDING,
      logoDataUrl: dataUrl,
      logoShape: 'circle',
      organizationName: sessionState.current?.user.organizationId === 'org-1' ? 'Salon 1' : 'Salon 2',
      showNameWithLogo: false,
    }), { status: 200 })
  })
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.restoreAllMocks()
  triggerResizeObserver = null
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
        ...DEFAULT_ORGANIZATION_BRANDING,
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
      ...DEFAULT_ORGANIZATION_BRANDING,
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

  it('shows the organization name with its logo when that preference is enabled', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      ...DEFAULT_ORGANIZATION_BRANDING,
      logoDataUrl: 'data:image/webp;base64,AA==',
      logoShape: 'circle',
      portalLogoSize: 160,
      organizationName: 'Studio Étoile',
      showNameWithLogo: true,
    }), { status: 200 }))

    render(<OrganizationBrand variant="mobile" />)

    expect(await screen.findByTitle('Studio Étoile')).toHaveClass('order-2')
    const logo = screen.getByRole('img', { name: 'Logo de l’organisation' })
    expect(logo).toHaveClass('order-1')
    expect(logo).toHaveStyle({ width: '48px', height: '48px' })
  })

  it('caps the shared logo size at 64 pixels in the desktop sidebar', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      ...DEFAULT_ORGANIZATION_BRANDING,
      logoDataUrl: 'data:image/webp;base64,AA==',
      portalLogoSize: 160,
    }), { status: 200 }))

    render(<OrganizationBrand variant="sidebar" />)

    const logo = await screen.findByRole('img', { name: 'Logo de l’organisation' })
    expect(logo).toHaveStyle({ width: '64px', height: '64px' })
  })

  it('stacks the title below the logo only when the remaining width is insufficient', () => {
    expect(shouldStackOrganizationBrand(200, 120, 48, 12)).toBe(false)
    expect(shouldStackOrganizationBrand(170, 120, 48, 12)).toBe(true)
  })

  it('moves the title below the logo when resizing leaves insufficient width', async () => {
    let availableWidth = 200
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => availableWidth)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const width = this.getAttribute('aria-hidden') === 'true'
        ? 120
        : this.getAttribute('role') === 'img' ? 48 : 0
      return new DOMRect(0, 0, width, 32)
    })
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      ...DEFAULT_ORGANIZATION_BRANDING,
      logoDataUrl: 'data:image/webp;base64,AA==',
      logoShape: 'circle',
      portalLogoSize: 160,
      organizationName: 'Studio Étoile',
      showNameWithLogo: true,
    }), { status: 200 }))

    render(<OrganizationBrand variant="mobile" />)

    const title = await screen.findByTitle('Studio Étoile')
    const logo = screen.getByRole('img', { name: 'Logo de l’organisation' })
    await waitFor(() => {
      expect(title).toHaveClass('order-2', 'text-right')
      expect(logo).toHaveClass('order-1')
    })

    act(() => {
      availableWidth = 170
      triggerResizeObserver?.()
    })

    await waitFor(() => {
      expect(title).toHaveClass('order-2', 'text-center')
      expect(logo).toHaveClass('order-1')
    })
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import BrandingSettings from '@/components/settings/BrandingSettings'

const savedBranding = {
  logoDataUrl: null,
  logoShape: 'square',
  logoSize: 'large',
  organizationName: 'Nouveau salon',
  showNameWithLogo: true,
  portalNameFont: 'notoSerif',
  portalNameSize: 24,
  portalNameColor: 'emerald',
  portalNameWeight: 'bold',
  portalNameAlignment: 'right',
  portalLogoSize: 160,
}
const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  fetchMock.mockReset()
  fetchMock.mockImplementation(async (_input, init) => {
    if (init?.method === 'PATCH') {
      return new Response(JSON.stringify(savedBranding), { status: 200 })
    }
    return new Response(JSON.stringify({
      logoDataUrl: null,
      logoShape: 'circle',
      logoSize: 'medium',
      organizationName: 'Studio Étoile',
      showNameWithLogo: false,
      portalNameFont: 'manrope',
      portalNameSize: 18,
      portalNameColor: 'charcoal',
      portalNameWeight: 'semibold',
      portalNameAlignment: 'left',
      portalLogoSize: 48,
    }), { status: 200 })
  })
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('BrandingSettings', () => {
  it('saves logo and portal appearance settings and previews the selected viewport', async () => {
    render(<BrandingSettings />)

    fireEvent.change(await screen.findByRole('textbox', { name: 'Nom de l’organisation' }), {
      target: { value: 'Nouveau salon' },
    })
    fireEvent.click(await screen.findByRole('radio', { name: 'Carré' }))
    fireEvent.click(await screen.findByRole('radio', { name: 'Grand' }))
    fireEvent.click(screen.getByRole('checkbox', { name: /Afficher le nom avec le logo/ }))
    fireEvent.change(screen.getByLabelText('Police du nom du salon'), { target: { value: 'notoSerif' } })
    fireEvent.change(screen.getByLabelText('Taille du nom du salon (px)'), { target: { value: '24' } })
    fireEvent.change(screen.getByLabelText('Couleur du nom du salon'), { target: { value: 'emerald' } })
    fireEvent.change(screen.getByLabelText('Graisse du nom du salon'), { target: { value: 'bold' } })
    fireEvent.change(screen.getByLabelText('Alignement du nom du salon'), { target: { value: 'right' } })
    fireEvent.change(screen.getByLabelText('Taille du logo du portail (px)'), { target: { value: '160' } })
    fireEvent.click(screen.getByRole('button', { name: 'Grand écran' }))
    expect(screen.getByTestId('portal-brand-preview')).toHaveAttribute('data-viewport', 'desktop')
    expect(screen.getByTestId('portal-brand-preview')).toHaveAttribute('data-logo-size', '160')
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer les modifications' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Personnalisation enregistrée.')
    const patchCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH')
    expect(patchCall).toBeDefined()
    expect(JSON.parse(String(patchCall?.[1]?.body))).toEqual({
      logoDataUrl: null,
      logoShape: 'square',
      logoSize: 'large',
      organizationName: 'Nouveau salon',
      showNameWithLogo: true,
      portalNameFont: 'notoSerif',
      portalNameSize: 24,
      portalNameColor: 'emerald',
      portalNameWeight: 'bold',
      portalNameAlignment: 'right',
      portalLogoSize: 160,
    })
  })

  it('keeps an empty organization name from being saved', async () => {
    render(<BrandingSettings />)

    fireEvent.change(await screen.findByRole('textbox', { name: 'Nom de l’organisation' }), {
      target: { value: '   ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer les modifications' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Le nom est obligatoire')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('rejects unsupported and oversized logo files before opening the cropper', async () => {
    render(<BrandingSettings />)
    const input = await screen.findByLabelText('Importer ou recadrer une image')
    const unsupportedFile = new File(['image'], 'logo.svg', { type: 'image/svg+xml' })

    fireEvent.change(input, { target: { files: [unsupportedFile] } })
    expect(await screen.findByRole('alert')).toHaveTextContent('Choisissez une image PNG, JPEG ou WebP.')

    const oversizedFile = new File(['image'], 'logo.png', { type: 'image/png' })
    Object.defineProperty(oversizedFile, 'size', { value: 10 * 1024 * 1024 + 1 })
    fireEvent.change(input, { target: { files: [oversizedFile] } })

    expect(await screen.findByRole('alert')).toHaveTextContent('Le fichier ne peut pas dépasser 10 Mo.')
    expect(screen.queryByRole('dialog', { name: 'Recadrer le logo' })).not.toBeInTheDocument()
  })

  it('resets portal appearance in the preview without saving it', async () => {
    render(<BrandingSettings />)

    fireEvent.change(await screen.findByLabelText('Police du nom du salon'), { target: { value: 'notoSerif' } })
    fireEvent.click(screen.getByRole('button', { name: 'Rétablir les valeurs par défaut' }))

    expect(screen.getByLabelText('Police du nom du salon')).toHaveValue('manrope')
    expect(screen.getByLabelText('Taille du nom du salon (px)')).toHaveValue('18')
    expect(screen.getByLabelText('Taille du logo du portail (px)')).toHaveValue('48')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

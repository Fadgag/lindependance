import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import BrandingSettings from '@/components/settings/BrandingSettings'

const savedBranding = { logoDataUrl: null, logoShape: 'square' }
const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  fetchMock.mockReset()
  fetchMock.mockImplementation(async (_input, init) => {
    if (init?.method === 'PATCH') {
      return new Response(JSON.stringify(savedBranding), { status: 200 })
    }
    return new Response(JSON.stringify({ logoDataUrl: null, logoShape: 'circle' }), { status: 200 })
  })
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('BrandingSettings', () => {
  it('saves the selected logo shape and reports success', async () => {
    render(<BrandingSettings />)

    fireEvent.click(await screen.findByRole('radio', { name: 'Carré' }))
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le logo' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Logo enregistré.')
    const patchCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH')
    expect(patchCall).toBeDefined()
    expect(JSON.parse(String(patchCall?.[1]?.body))).toEqual({
      logoDataUrl: null,
      logoShape: 'square',
    })
  })
})

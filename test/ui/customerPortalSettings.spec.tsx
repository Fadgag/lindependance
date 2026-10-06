import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import CustomerPortalSettingsPage from '@/app/(dashboard)/settings/portail/page'

function response(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const baseSettings = {
  slug: 'atelier',
  portalEnabled: false,
  timezone: 'Europe/Paris',
  portalContactPhone: null,
  portalContactEmail: null,
  activePractitionerCount: 1,
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn()
    .mockResolvedValueOnce(response(baseSettings))
    .mockResolvedValueOnce(response({ ...baseSettings, portalContactPhone: '01 23 45 67 89' })))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('CustomerPortalSettingsPage', () => {
  it('saves public contact details without sending the read-only practitioner count', async () => {
    render(<CustomerPortalSettingsPage />)

    fireEvent.change(await screen.findByLabelText('Téléphone'), {
      target: { value: '01 23 45 67 89' },
    })
    const form = screen.getByRole('button', { name: 'Enregistrer les réglages' }).closest('form')
    expect(form).not.toBeNull()
    if (!form) return
    fireEvent.submit(form)

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
    const request = vi.mocked(fetch).mock.calls[1]
    const options = request?.[1]
    expect(options?.method).toBe('PATCH')
    expect(JSON.parse(String(options?.body))).toEqual({
      slug: 'atelier',
      portalEnabled: false,
      timezone: 'Europe/Paris',
      portalContactPhone: '01 23 45 67 89',
      portalContactEmail: null,
    })
  })

  it('prevents enabling the portal when no active practitioner exists', async () => {
    vi.mocked(fetch).mockReset()
    vi.mocked(fetch).mockResolvedValueOnce(response({
      ...baseSettings,
      activePractitionerCount: 0,
    }))
    render(<CustomerPortalSettingsPage />)

    expect(await screen.findByRole('checkbox', { name: /activer les réservations en ligne/i }))
      .toBeDisabled()
    expect(screen.getByText(/ajoutez au moins un praticien actif/i)).toBeInTheDocument()
  })
})

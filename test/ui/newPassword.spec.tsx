import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import NewPasswordClient from '@/app/auth/new-password/NewPasswordClient'
import NewPasswordPage from '@/app/auth/new-password/page'

const mocks = vi.hoisted(() => ({ push: vi.fn() }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}))

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('password reset page', () => {
  it('reads the token from Next.js async search params and reports success', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)

    const page = await NewPasswordPage({
      searchParams: Promise.resolve({ token: 'a'.repeat(64) }),
    })
    render(page)
    fireEvent.change(screen.getByPlaceholderText('Nouveau mot de passe'), {
      target: { value: 'new-password' },
    })
    fireEvent.change(screen.getByPlaceholderText('Confirmer le mot de passe'), {
      target: { value: 'new-password' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Réinitialiser' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Mot de passe réinitialisé')
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/reset-password', expect.objectContaining({
      body: JSON.stringify({ token: 'a'.repeat(64), password: 'new-password' }),
    }))
  })

  it('shows the server error and keeps the form available for retry', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: 'Token expired',
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })))

    render(<NewPasswordClient token={'a'.repeat(64)} />)
    fireEvent.change(screen.getByPlaceholderText('Nouveau mot de passe'), {
      target: { value: 'new-password' },
    })
    fireEvent.change(screen.getByPlaceholderText('Confirmer le mot de passe'), {
      target: { value: 'new-password' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Réinitialiser' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Token expired')
    expect(screen.getByRole('button', { name: 'Réinitialiser' })).toBeEnabled()
  })

  it('shows a useful message when the request cannot reach the server', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network unavailable')))

    render(<NewPasswordClient token={'a'.repeat(64)} />)
    fireEvent.change(screen.getByPlaceholderText('Nouveau mot de passe'), {
      target: { value: 'new-password' },
    })
    fireEvent.change(screen.getByPlaceholderText('Confirmer le mot de passe'), {
      target: { value: 'new-password' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Réinitialiser' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Impossible de contacter le serveur')
  })

  it('explains when the reset token is missing', () => {
    render(<NewPasswordClient />)

    expect(screen.getByRole('alert')).toHaveTextContent('Lien de réinitialisation invalide ou incomplet')
    expect(screen.getByRole('button', { name: 'Réinitialiser' })).toBeDisabled()
  })
})

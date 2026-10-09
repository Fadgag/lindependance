import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import React from 'react'
import ClientDetail from '@/app/customers/[id]/page'

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'customer-1' }),
}))

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}))

vi.mock('@/components/dashboard/CheckoutModal', () => ({ default: () => null }))

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('ClientDetail', () => {
  it('saves a changed email before sending the portal reservation information', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        id: 'customer-1',
        firstName: 'Camille',
        lastName: 'Martin',
        phone: '0600000000',
        email: 'old@example.com',
        appointments: [],
      }))
      .mockResolvedValueOnce(jsonResponse({ email: 'new@example.com' }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)

    render(<ClientDetail />)

    const email = await screen.findByLabelText('Email de contact')
    fireEvent.change(email, { target: { value: 'new@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer les informations de réservation' }))

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('E-mail envoyé au client.')
    })

    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/customers', expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({ id: 'customer-1', email: 'new@example.com' }),
    }))
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/api/customers/customer-1/send-portal-email',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('does not offer to send reservation information without an email', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      id: 'customer-1',
      firstName: 'Camille',
      lastName: 'Martin',
      phone: null,
      email: null,
      appointments: [],
    })))

    render(<ClientDetail />)

    const sendButton = await screen.findByRole('button', { name: 'Envoyer les informations de réservation' })
    expect(sendButton).toBeDisabled()
  })
})

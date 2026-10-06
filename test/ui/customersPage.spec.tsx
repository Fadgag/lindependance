import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import ClientsPage from '@/app/customers/page'
import CustomerModal from '@/components/customers/CustomerModal'

vi.mock('next/dynamic', () => ({
  default: () => function MockCustomerModal({
    isOpen,
    onCreatedAction,
  }: {
    isOpen: boolean
    onCreatedAction?: () => void
  }) {
    return isOpen
      ? <button onClick={() => onCreatedAction?.()}>Simulate successful creation</button>
      : null
  },
}))

vi.mock('@/components/ui/BaseModal', () => ({
  default: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div aria-label={title}>{children}</div>
  ),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

vi.mock('@/lib/toast', () => ({ showToast: vi.fn() }))

function jsonResponse(body: object) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('ClientsPage', () => {
  it('reloads the list after customer creation and keeps the active search', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse([
        { id: 'old', firstName: 'Anna', lastName: 'Martin', phone: '0600000000' },
      ]))
      .mockResolvedValueOnce(jsonResponse([
        { id: 'new', firstName: 'Anaïs', lastName: 'Martin', phone: '0611111111' },
        { id: 'old', firstName: 'Anna', lastName: 'Martin', phone: '0600000000' },
      ]))
    vi.stubGlobal('fetch', fetchMock)

    render(<ClientsPage />)

    expect(await screen.findByText('Anna Martin')).toBeInTheDocument()
    const search = screen.getByPlaceholderText('Rechercher par nom ou téléphone')
    fireEvent.change(search, { target: { value: 'Ana' } })
    fireEvent.click(screen.getByRole('button', { name: /Nouveau Client/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Simulate successful creation' }))

    expect(await screen.findByText('Anaïs Martin')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(search).toHaveValue('Ana')
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ cache: 'no-store' })
  })
})

describe('CustomerModal', () => {
  it('notifies the customer list after a successful save', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      id: 'new',
      firstName: 'Anaïs',
      lastName: 'Martin',
    })))
    const onCreatedAction = vi.fn()
    const onCloseAction = vi.fn()

    render(
      <CustomerModal
        isOpen
        onCloseAction={onCloseAction}
        onCreatedAction={onCreatedAction}
      />
    )

    const [firstName, lastName, phone] = screen.getAllByRole('textbox')
    if (!firstName || !lastName || !phone) {
      throw new Error('Customer form fields were not rendered')
    }
    fireEvent.change(firstName, { target: { value: 'Anaïs' } })
    fireEvent.change(lastName, { target: { value: 'Martin' } })
    fireEvent.change(phone, { target: { value: '0611111111' } })
    fireEvent.click(screen.getByRole('button', { name: 'Créer la cliente' }))

    await waitFor(() => expect(onCreatedAction).toHaveBeenCalledOnce())
    expect(onCloseAction).toHaveBeenCalledOnce()
  })
})

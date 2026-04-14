import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { Customer } from '@/types/models'

// Mock hooks and components
// Mock next-auth to avoid importing next/server in tests
vi.mock('next-auth/react', () => ({ useSession: () => ({ status: 'authenticated', data: { user: { name: 'Test' } } }) }))
vi.mock('next-auth', () => ({
  __esModule: true,
  default: (opts: any) => ({ handlers: {}, auth: () => {}, signIn: () => {}, signOut: () => {} }),
}))
vi.mock('@/hooks/useCustomers', () => {
  return {
    __esModule: true,
    default: () => ({ customers: [{ id: 'c1', name: 'Alice' }] })
  }
})
vi.mock('@/hooks/useServices', () => {
  return {
    __esModule: true,
    default: () => ({ services: [{ id: 's1', name: 'Cut' }], isLoading: false })
  }
})

// Mock CustomerPicker to be a simple select we can interact with
vi.mock('@/components/calendar/CustomerPicker', () => {
  return {
    __esModule: true,
    CustomerPicker: ({ customers, selectedId, onSelect }: {
      customers: Customer[]
      selectedId?: string
      onSelect: (id: string) => void
    }) => (
      <select data-testid="mock-customer-picker" value={selectedId || ''} onChange={(e) => onSelect(e.target.value)}>
        <option value="">--</option>
        {customers.map((c: Customer) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
    )
  }
})

// Mock router
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
// Mock toast
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
// Mock server action to avoid importing Next server/runtime during tests
vi.mock('@/app/actions/quickAppointmentAction', () => ({ createQuickAppointment: () => {} }))

import QuickAppointmentModal from '@/components/appointments/QuickAppointmentModal'

describe('QuickAppointmentModal validation', () => {
  beforeEach(() => {
    // clear DOM
    document.body.innerHTML = ''
  })

  it('shows validation errors when required fields are empty and clears them when filled', async () => {
    const { container } = render(<QuickAppointmentModal />)

    // open modal by clicking FAB
    const fab = await screen.getByTestId('floating-quick-rdv')
    fireEvent.click(fab)

    // click create without filling
    const createBtn = await screen.getByText('Créer')
    fireEvent.click(createBtn)

    // errors should be visible: customer error and service marked invalid
    expect(await screen.findByText(/Veuillez sélectionner un client\.?/i)).toBeInTheDocument()
    const comboboxes = screen.getAllByRole('combobox')
    const serviceSelectBefore = comboboxes.find((el) => (el as HTMLSelectElement).getAttribute('name') === 'serviceId') as HTMLSelectElement
    expect(serviceSelectBefore).toBeTruthy()
    expect(serviceSelectBefore).toHaveAttribute('aria-invalid', 'true')

    // fix customer via mocked picker
    const customerSelect = screen.getByTestId('mock-customer-picker') as HTMLSelectElement
    fireEvent.change(customerSelect, { target: { value: 'c1' } })
    // fix service
    const serviceSelectAfter = screen.getAllByRole('combobox').find((el) => (el as HTMLSelectElement).getAttribute('name') === 'serviceId') as HTMLSelectElement
    fireEvent.change(serviceSelectAfter, { target: { value: 's1' } })

    // submit again
    fireEvent.click(createBtn)

    // after fixing, client error should be gone and service is no longer invalid
    expect(screen.queryByText(/Veuillez sélectionner un client\.?/i)).toBeNull()
    expect(serviceSelectAfter).not.toHaveAttribute('aria-invalid', 'true')
  })
})









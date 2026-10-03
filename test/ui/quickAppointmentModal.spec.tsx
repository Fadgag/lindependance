import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  useCustomers: vi.fn(() => ({ customers: [], reload: vi.fn() })),
  useServices: vi.fn(() => ({ services: [], reload: vi.fn() })),
}))

vi.mock('next-auth/react', () => ({
  useSession: mocks.getSession,
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))
vi.mock('@/hooks/useCustomers', () => ({ default: mocks.useCustomers }))
vi.mock('@/hooks/useServices', () => ({ default: mocks.useServices }))
vi.mock('@/components/calendar/AppointmentModal', () => ({
  default: () => <div data-testid="appointment-modal" />,
}))

import QuickAppointmentModal from '@/components/appointments/QuickAppointmentModal'

afterEach(() => {
  cleanup()
  document.getElementById('fab-portal')?.remove()
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('QuickAppointmentModal', () => {
  it('does not render the appointment action or load staff data for customers', () => {
    mocks.getSession.mockReturnValue({
      data: { user: { accountType: 'CUSTOMER', role: 'USER' } },
      status: 'authenticated',
    })

    const { queryByTestId } = render(<QuickAppointmentModal />)

    expect(queryByTestId('floating-quick-rdv')).not.toBeInTheDocument()
    expect(queryByTestId('appointment-modal')).not.toBeInTheDocument()
    expect(mocks.useCustomers).not.toHaveBeenCalled()
    expect(mocks.useServices).not.toHaveBeenCalled()
  })

  it.each([
    ['ADMIN', 'ADMIN'],
    ['staff', 'USER'],
  ])('renders the quick appointment action for %s staff accounts', async (_accountLabel, role) => {
    mocks.getSession.mockReturnValue({
      data: { user: { accountType: 'STAFF', role } },
      status: 'authenticated',
    })

    render(<QuickAppointmentModal />)

    expect(await screen.findByTestId('floating-quick-rdv')).toBeInTheDocument()
    expect(screen.getByTestId('appointment-modal')).toBeInTheDocument()
    expect(mocks.useCustomers).toHaveBeenCalledOnce()
    expect(mocks.useServices).toHaveBeenCalledOnce()
  })

  it('does not render the appointment action while the session is unavailable', () => {
    mocks.getSession.mockReturnValue({ data: null, status: 'loading' })

    const { queryByTestId } = render(<QuickAppointmentModal />)

    expect(queryByTestId('floating-quick-rdv')).not.toBeInTheDocument()
    expect(mocks.useCustomers).not.toHaveBeenCalled()
    expect(mocks.useServices).not.toHaveBeenCalled()
  })

  it('does not render the appointment action for technical administrators', () => {
    mocks.getSession.mockReturnValue({
      data: { user: { accountType: 'STAFF', role: 'TECH_ADMIN' } },
      status: 'authenticated',
    })

    const { queryByTestId } = render(<QuickAppointmentModal />)

    expect(queryByTestId('floating-quick-rdv')).not.toBeInTheDocument()
    expect(queryByTestId('appointment-modal')).not.toBeInTheDocument()
    expect(mocks.useCustomers).not.toHaveBeenCalled()
    expect(mocks.useServices).not.toHaveBeenCalled()
  })
})

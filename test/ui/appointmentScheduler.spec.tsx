import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@fullcalendar/react', async () => {
  const { createElement } = await import('react')

  return {
    default: (props: {
      initialView: string
      dayMinWidth?: number
      headerToolbar?: { right?: string }
    }) => createElement('div', {
      'data-testid': 'calendar',
      'data-initial-view': props.initialView,
      'data-day-min-width': props.dayMinWidth?.toString(),
      'data-header-view-controls': props.headerToolbar?.right,
    }),
  }
})

vi.mock('@fullcalendar/timegrid', () => ({ default: {} }))
vi.mock('@fullcalendar/interaction', () => ({ default: {} }))
vi.mock('@fullcalendar/daygrid', () => ({ default: {} }))
vi.mock('@fullcalendar/core/locales/fr', () => ({ default: {} }))

vi.mock('@/hooks/useOrganizationSettings', () => ({
  useOrganizationSettings: () => ({ openingTime: '09:00', closingTime: '18:00' }),
}))

vi.mock('@/hooks/useCalendarData', () => ({
  useCalendarData: () => ({
    events: [],
    unavailabilities: [],
    customers: [],
    services: [],
    staffs: [],
    fetchAppointments: vi.fn(),
    fetchUnavailabilities: vi.fn(),
    checkUnavailabilityConflict: vi.fn(),
  }),
}))

vi.mock('@/components/calendar/AppointmentModal', () => ({ default: () => null }))
vi.mock('@/components/calendar/UnavailabilityModal', () => ({ default: () => null }))
vi.mock('@/components/calendar/CalendarEventContent', () => ({ CalendarEventContent: () => null }))
vi.mock('@/components/customer-portal/PortalBookingCounter', () => ({ default: () => null }))
vi.mock('sonner', () => ({ toast: { warning: vi.fn(), error: vi.fn() } }))

import AppointmentScheduler from '@/components/AppointmentScheduler'

function setMobileViewport(isMobile: boolean) {
  vi.stubGlobal('matchMedia', (media: string) => ({
    matches: isMobile,
    media,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('AppointmentScheduler responsive layout', () => {
  it('starts in the day view on mobile and keeps the day/week controls available', async () => {
    setMobileViewport(true)

    render(<AppointmentScheduler />)

    const calendar = await screen.findByTestId('calendar')
    expect(calendar).toHaveAttribute('data-initial-view', 'timeGridDay')
    expect(calendar).not.toHaveAttribute('data-day-min-width')
    expect(calendar).toHaveAttribute('data-header-view-controls', 'timeGridDay,timeGridWeek')
  })

  it('keeps the week view as the initial desktop view', async () => {
    setMobileViewport(false)

    render(<AppointmentScheduler />)

    expect(await screen.findByTestId('calendar')).toHaveAttribute('data-initial-view', 'timeGridWeek')
  })
})

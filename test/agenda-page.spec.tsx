import { beforeEach, describe, expect, it, vi } from 'vitest'

const { auth, redirect } = vi.hoisted(() => ({
  auth: vi.fn(),
  redirect: vi.fn(),
}))

vi.mock('@/auth', () => ({ auth }))
vi.mock('next/navigation', () => ({ redirect }))
vi.mock('@/components/AppointmentScheduler', () => ({
  default: () => <div />,
}))

import AgendaPage from '@/app/agenda/page'

beforeEach(() => {
  vi.resetAllMocks()
  redirect.mockImplementation((destination: string) => {
    throw new Error(`NEXT_REDIRECT:${destination}`)
  })
})

describe('agenda page authentication', () => {
  it('redirects when Auth.js returns a truthy error object without a user', async () => {
    auth.mockResolvedValue({ error: 'Configuration' })

    await expect(AgendaPage()).rejects.toThrow('NEXT_REDIRECT:/auth/signin')
    expect(redirect).toHaveBeenCalledWith('/auth/signin')
  })

  it('renders for a session with a user', async () => {
    auth.mockResolvedValue({ user: { id: 'staff-1' } })

    await expect(AgendaPage()).resolves.toMatchObject({
      type: 'div',
    })
    expect(redirect).not.toHaveBeenCalled()
  })
})

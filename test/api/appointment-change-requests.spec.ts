import { beforeEach, describe, expect, it, vi } from 'vitest'

const { authMock, changeRequestsServiceMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  changeRequestsServiceMock: {
    getPendingAppointmentChangeRequests: vi.fn(),
    approveAppointmentChangeRequest: vi.fn(),
    rejectAppointmentChangeRequest: vi.fn(),
  },
}))

vi.mock('@/auth', () => ({ auth: authMock }))
vi.mock('@/services/appointmentChangeRequests.service', () => changeRequestsServiceMock)

import { GET } from '@/app/api/appointments/change-requests/route'
import { POST as approve } from '@/app/api/appointments/change-requests/[id]/approve/route'
import { POST as reject } from '@/app/api/appointments/change-requests/[id]/reject/route'
import { auth } from '@/auth'
import {
  approveAppointmentChangeRequest,
  getPendingAppointmentChangeRequests,
  rejectAppointmentChangeRequest,
} from '@/services/appointmentChangeRequests.service'

const staffSession = {
  user: {
    id: 'staff-user-1',
    organizationId: 'org-1',
    accountType: 'STAFF',
  },
}
const context = { params: Promise.resolve({ id: 'request-1' }) }

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(auth).mockResolvedValue(staffSession as never)
  vi.mocked(getPendingAppointmentChangeRequests).mockResolvedValue({
    timezone: 'Europe/Paris',
    requests: [],
  })
  vi.mocked(approveAppointmentChangeRequest).mockResolvedValue(undefined)
  vi.mocked(rejectAppointmentChangeRequest).mockResolvedValue(undefined)
})

describe('staff appointment change-request endpoints', () => {
  it('returns pending requests scoped to the authenticated staff organization', async () => {
    const response = await GET()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ timezone: 'Europe/Paris', requests: [] })
    expect(getPendingAppointmentChangeRequests).toHaveBeenCalledWith({ organizationId: 'org-1' })
  })

  it('requires a staff account for all review actions', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: 'customer-1', organizationId: 'org-1', accountType: 'CUSTOMER' },
    } as never)
    const response = await approve(new Request('https://example.test', { method: 'POST' }), context)
    expect(response.status).toBe(403)
    expect(approveAppointmentChangeRequest).not.toHaveBeenCalled()
  })

  it('approves with the staff reviewer id and rejects with a validated reason', async () => {
    const approved = await approve(
      new Request('https://example.test', { method: 'POST' }),
      context,
    )
    expect(approved.status).toBe(200)
    expect(approveAppointmentChangeRequest).toHaveBeenCalledWith({
      requestId: 'request-1',
      organizationId: 'org-1',
      reviewerId: 'staff-user-1',
    })

    const rejected = await reject(new Request('https://example.test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewReason: 'Créneau non disponible' }),
    }), context)
    expect(rejected.status).toBe(200)
    expect(rejectAppointmentChangeRequest).toHaveBeenCalledWith({
      requestId: 'request-1',
      organizationId: 'org-1',
      reviewerId: 'staff-user-1',
      reviewReason: 'Créneau non disponible',
    })
  })
})

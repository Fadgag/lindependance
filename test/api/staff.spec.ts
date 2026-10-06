import { beforeEach, describe, expect, it, vi } from 'vitest'

const { authMock, listStaffMock, createStaffMock, updateStaffMock, archiveStaffMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  listStaffMock: vi.fn(),
  createStaffMock: vi.fn(),
  updateStaffMock: vi.fn(),
  archiveStaffMock: vi.fn(),
}))

vi.mock('@/auth', () => ({ auth: authMock }))
vi.mock('@/services/staff.service', () => ({
  listOrganizationStaff: listStaffMock,
  createOrganizationStaff: createStaffMock,
  updateOrganizationStaff: updateStaffMock,
  archiveOrganizationStaff: archiveStaffMock,
}))

import { DELETE, GET, POST, PUT } from '@/app/api/staff/route'
import { auth } from '@/auth'
import {
  archiveOrganizationStaff,
  createOrganizationStaff,
  listOrganizationStaff,
  updateOrganizationStaff,
} from '@/services/staff.service'

function post(body: unknown) {
  return new Request('https://example.test/api/staff', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function put(id: string, body: unknown) {
  return new Request(`https://example.test/api/staff?id=${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function remove(id: string, expectedAppointmentCount?: number) {
  const confirmation = expectedAppointmentCount === undefined
    ? ''
    : `&expectedAppointmentCount=${expectedAppointmentCount}`
  return new Request(`https://example.test/api/staff?id=${encodeURIComponent(id)}${confirmation}`, {
    method: 'DELETE',
  })
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('/api/staff', () => {
  it('returns practitioners scoped to the signed-in organization for calendar resources', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { organizationId: 'org-1', role: 'ADMIN' },
    } as never)
    vi.mocked(listOrganizationStaff).mockResolvedValue([{
      id: 'staff-1',
      firstName: 'Coiffeur',
      lastName: '1',
      active: true,
    }])

    const response = await GET(new Request('https://example.test/api/staff'))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual([{
      id: 'staff-1',
      firstName: 'Coiffeur',
      lastName: '1',
      active: true,
      title: 'Coiffeur 1',
    }])
    expect(listOrganizationStaff).toHaveBeenCalledWith('org-1')
  })

  it('creates a practitioner for the authenticated admin organization only', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { organizationId: 'org-1', role: 'ADMIN' },
    } as never)
    vi.mocked(createOrganizationStaff).mockResolvedValue({
      id: 'staff-1',
      firstName: 'Coiffeur',
      lastName: '1',
      active: true,
    })

    const response = await POST(post({
      firstName: ' Coiffeur ',
      lastName: ' 1 ',
      organizationId: 'org-2',
    }))

    expect(response.status).toBe(400)
    expect(createOrganizationStaff).not.toHaveBeenCalled()

    const validResponse = await POST(post({ firstName: ' Coiffeur ', lastName: ' 1 ' }))
    expect(validResponse.status).toBe(201)
    expect(createOrganizationStaff).toHaveBeenCalledWith({
      organizationId: 'org-1',
      firstName: 'Coiffeur',
      lastName: '1',
    })
  })

  it('forbids non-admin users from managing practitioners', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { organizationId: 'org-1', role: 'STAFF' },
    } as never)

    const response = await POST(post({ firstName: 'Camille', lastName: 'Martin' }))

    expect(response.status).toBe(403)
    expect(createOrganizationStaff).not.toHaveBeenCalled()
  })

  it('updates a practitioner within the authenticated admin organization', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { organizationId: 'org-1', role: 'ADMIN' },
    } as never)
    vi.mocked(updateOrganizationStaff).mockResolvedValue({
      status: 'updated',
      portalDisabled: false,
      notificationSent: null,
    })

    const response = await PUT(put('staff-1', {
      firstName: 'Camille',
      lastName: 'Martin',
    }))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      success: true,
      portalDisabled: false,
      notificationSent: null,
    })
    expect(updateOrganizationStaff).toHaveBeenCalledWith({
      id: 'staff-1',
      organizationId: 'org-1',
      firstName: 'Camille',
      lastName: 'Martin',
    })
  })

  it('reactivates an archived practitioner through the scoped update endpoint', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { organizationId: 'org-1', role: 'ADMIN' },
    } as never)
    vi.mocked(updateOrganizationStaff).mockResolvedValue({
      status: 'updated',
      portalDisabled: false,
      notificationSent: null,
    })

    const response = await PUT(put('staff-1', {
      firstName: 'Camille',
      lastName: 'Martin',
      active: true,
    }))

    expect(response.status).toBe(200)
    expect(updateOrganizationStaff).toHaveBeenCalledWith({
      id: 'staff-1',
      organizationId: 'org-1',
      firstName: 'Camille',
      lastName: 'Martin',
      active: true,
    })
  })

  it('returns not found when an update targets a practitioner outside the organization', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { organizationId: 'org-1', role: 'ADMIN' },
    } as never)
    vi.mocked(updateOrganizationStaff).mockResolvedValue({ status: 'not_found' })

    const response = await PUT(put('foreign-staff', {
      firstName: 'Camille',
      lastName: 'Martin',
    }))

    expect(response.status).toBe(404)
    expect(updateOrganizationStaff).toHaveBeenCalledWith(expect.objectContaining({
      id: 'foreign-staff',
      organizationId: 'org-1',
    }))
  })

  it('archives a practitioner within the authenticated admin organization', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { organizationId: 'org-1', role: 'ADMIN' },
    } as never)
    vi.mocked(archiveOrganizationStaff)
      .mockResolvedValueOnce({ status: 'confirmation_required', appointmentCount: 2 })
      .mockResolvedValueOnce({
        status: 'archived',
        appointmentCount: 2,
        portalDisabled: false,
        notificationSent: null,
      })

    const warningResponse = await DELETE(remove('staff-1'))

    expect(warningResponse.status).toBe(409)
    expect(await warningResponse.json()).toEqual({
      error: 'Appointments are linked to this practitioner',
      appointmentCount: 2,
    })
    expect(archiveOrganizationStaff).toHaveBeenLastCalledWith({
      id: 'staff-1',
      organizationId: 'org-1',
    })

    const response = await DELETE(remove('staff-1', 2))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      success: true,
      appointmentCount: 2,
      portalDisabled: false,
      notificationSent: null,
    })
    expect(archiveOrganizationStaff).toHaveBeenLastCalledWith({
      id: 'staff-1',
      organizationId: 'org-1',
      expectedAppointmentCount: 2,
    })
  })

  it('rejects invalid appointment confirmation counts', async () => {
    const response = await DELETE(remove('staff-1', -1))

    expect(response.status).toBe(400)
    expect(archiveOrganizationStaff).not.toHaveBeenCalled()
  })

  it('requires an id and rejects malformed update payloads', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { organizationId: 'org-1', role: 'ADMIN' },
    } as never)

    const missingId = await PUT(put('', { firstName: 'Camille', lastName: 'Martin' }))
    const invalidBody = await PUT(put('staff-1', { firstName: 'Camille', lastName: 42 }))

    expect(missingId.status).toBe(400)
    expect(invalidBody.status).toBe(400)
    expect(updateOrganizationStaff).not.toHaveBeenCalled()
  })

  it('forbids non-admin users from updating or archiving practitioners', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { organizationId: 'org-1', role: 'STAFF' },
    } as never)

    const updateResponse = await PUT(put('staff-1', {
      firstName: 'Camille',
      lastName: 'Martin',
    }))
    const archiveResponse = await DELETE(remove('staff-1'))

    expect(updateResponse.status).toBe(403)
    expect(archiveResponse.status).toBe(403)
    expect(updateOrganizationStaff).not.toHaveBeenCalled()
    expect(archiveOrganizationStaff).not.toHaveBeenCalled()
  })
})

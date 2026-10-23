import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  access: vi.fn(),
  listAccounts: vi.fn(),
  createAccount: vi.fn(),
  sendActivationEmail: vi.fn(),
  updateRole: vi.fn(),
  deleteAccount: vi.fn(),
}))

vi.mock('@/lib/organizationAdminAccess', () => ({
  getOrganizationAdminAccess: mocks.access,
}))
vi.mock('@/services/userAccounts.service', () => ({
  listOrganizationAccounts: mocks.listAccounts,
  createOrganizationAccount: mocks.createAccount,
  updateOrganizationAccountRole: mocks.updateRole,
  deleteOrganizationAccount: mocks.deleteAccount,
}))
vi.mock('@/services/staffActivationEmail.service', () => ({
  sendStaffActivationEmail: mocks.sendActivationEmail,
}))

import { DELETE, PATCH } from '@/app/api/users/[id]/route'
import { GET, POST } from '@/app/api/users/route'

function request(method: string, body?: unknown) {
  return new Request('https://example.test/api/users', {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
}

const userRouteContext = { params: Promise.resolve({ id: 'target-user' }) }

beforeEach(() => {
  vi.resetAllMocks()
  mocks.access.mockResolvedValue({
    authorized: true,
    userId: 'admin-1',
    organizationId: 'org-1',
  })
  mocks.listAccounts.mockResolvedValue([{
    id: 'user-1',
    name: 'Staff member',
    email: 'staff@example.com',
    role: 'USER',
    activationStatus: 'PENDING',
  }])
  mocks.createAccount.mockResolvedValue({
    kind: 'created',
    organizationName: 'Salon A',
    account: {
      id: 'user-2',
      email: 'staff@example.com',
      name: 'Staff member',
      role: 'ADMIN',
    },
  })
  mocks.sendActivationEmail.mockResolvedValue({ sent: true, error: null })
  mocks.updateRole.mockResolvedValue({ kind: 'updated' })
  mocks.deleteAccount.mockResolvedValue({ kind: 'deleted' })
})

describe('/api/users account management', () => {
  it('requires a salon ADMIN and lists only accounts in the actor organization', async () => {
    const response = await GET()

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    expect(mocks.listAccounts).toHaveBeenCalledWith('org-1')

    mocks.access.mockResolvedValueOnce({ authorized: false, status: 403 })
    expect((await GET()).status).toBe(403)
    expect(mocks.listAccounts).toHaveBeenCalledOnce()
  })

  it('creates passwordless USER or ADMIN invitations and never returns secrets', async () => {
    const response = await POST(request('POST', {
      email: ' STAFF@Example.com ',
      name: 'Staff member',
      role: 'ADMIN',
      confirmControlledEmail: true,
    }))

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({
      account: {
        id: 'user-2',
        email: 'staff@example.com',
        name: 'Staff member',
        role: 'ADMIN',
      },
      invitation: { sent: true, error: null },
    })
    expect(mocks.createAccount).toHaveBeenCalledWith({
      actorId: 'admin-1',
      organizationId: 'org-1',
      email: 'staff@example.com',
      name: 'Staff member',
      role: 'ADMIN',
    })
    expect(mocks.sendActivationEmail).toHaveBeenCalledWith({
      email: 'staff@example.com',
      organizationName: 'Salon A',
    })
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
  })

  it('rejects passwords, caller-selected organizations, and TECH_ADMIN before creating accounts', async () => {
    for (const body of [
      { email: 'staff@example.com', confirmControlledEmail: true, password: 'not-allowed' },
      { email: 'staff@example.com', confirmControlledEmail: true, organizationId: 'org-2' },
      { email: 'staff@example.com', confirmControlledEmail: true, role: 'TECH_ADMIN' },
      { email: 'staff@example.com', role: 'USER' },
    ]) {
      expect((await POST(request('POST', body))).status).toBe(400)
    }
    expect(mocks.createAccount).not.toHaveBeenCalled()
    expect(mocks.sendActivationEmail).not.toHaveBeenCalled()
  })

  it('reports duplicate addresses explicitly and does not send an invitation', async () => {
    mocks.createAccount.mockResolvedValueOnce({ kind: 'email_exists' })

    const response = await POST(request('POST', {
      email: 'staff@example.com',
      confirmControlledEmail: true,
    }))

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({
      error: 'Cette adresse e-mail est déjà associée à un compte.',
    })
    expect(mocks.sendActivationEmail).not.toHaveBeenCalled()
  })

  it('scopes role changes to the actor organization and does not allow TECH_ADMIN', async () => {
    expect((await PATCH(request('PATCH', { role: 'TECH_ADMIN' }), userRouteContext)).status).toBe(400)
    expect(mocks.updateRole).not.toHaveBeenCalled()

    const response = await PATCH(request('PATCH', { role: 'ADMIN' }), userRouteContext)

    expect(response.status).toBe(200)
    expect(mocks.updateRole).toHaveBeenCalledWith({
      actorId: 'admin-1',
      organizationId: 'org-1',
      accountId: 'target-user',
      role: 'ADMIN',
    })
  })

  it('reports cross-salon accounts as not found and protects the last ADMIN on deletion', async () => {
    mocks.updateRole.mockResolvedValueOnce({ kind: 'not_found' })
    expect((await PATCH(request('PATCH', { role: 'USER' }), userRouteContext)).status).toBe(404)

    mocks.deleteAccount.mockResolvedValueOnce({ kind: 'last_admin' })
    const response = await DELETE(request('DELETE'), userRouteContext)

    expect(response.status).toBe(409)
    expect(mocks.deleteAccount).toHaveBeenCalledWith({
      actorId: 'admin-1',
      organizationId: 'org-1',
      accountId: 'target-user',
    })
  })
})

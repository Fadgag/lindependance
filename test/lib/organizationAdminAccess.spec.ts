import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  userFindUnique: vi.fn(),
}))

vi.mock('@/auth', () => ({ auth: mocks.auth }))
vi.mock('@/lib/prisma', () => ({
  prisma: { user: { findUnique: mocks.userFindUnique } },
}))

import { getOrganizationAdminAccess } from '@/lib/organizationAdminAccess'

beforeEach(() => {
  vi.resetAllMocks()
  mocks.auth.mockResolvedValue({
    user: {
      id: 'admin-1',
      role: 'ADMIN',
      accountType: 'STAFF',
      organizationId: 'organization-from-session',
    },
  })
  mocks.userFindUnique.mockResolvedValue({
    role: 'ADMIN',
    organizationId: 'organization-from-database',
  })
})

describe('organization ADMIN access', () => {
  it('requires an authenticated session', async () => {
    mocks.auth.mockResolvedValueOnce(null)

    await expect(getOrganizationAdminAccess()).resolves.toEqual({
      authorized: false,
      status: 401,
    })
    expect(mocks.userFindUnique).not.toHaveBeenCalled()
  })

  it('rechecks the current database role and takes the organization from that record', async () => {
    mocks.userFindUnique.mockResolvedValueOnce({
      role: 'USER',
      organizationId: 'organization-from-database',
    })
    await expect(getOrganizationAdminAccess()).resolves.toEqual({
      authorized: false,
      status: 403,
    })

    await expect(getOrganizationAdminAccess()).resolves.toEqual({
      authorized: true,
      userId: 'admin-1',
      organizationId: 'organization-from-database',
    })
  })

  it('does not grant salon account access to technical or customer accounts', async () => {
    mocks.auth.mockResolvedValueOnce({
      user: { id: 'tech-1', role: 'TECH_ADMIN', accountType: 'STAFF' },
    })
    mocks.userFindUnique.mockResolvedValueOnce({
      role: 'TECH_ADMIN',
      organizationId: 'organization-from-database',
    })
    await expect(getOrganizationAdminAccess()).resolves.toEqual({
      authorized: false,
      status: 403,
    })

    mocks.auth.mockResolvedValueOnce({
      user: { id: 'customer-1', role: 'ADMIN', accountType: 'CUSTOMER' },
    })
    await expect(getOrganizationAdminAccess()).resolves.toEqual({
      authorized: false,
      status: 403,
    })
  })
})

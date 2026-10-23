import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique },
  },
}))

import { refreshAuthTokenClaims } from '@/services/authSession.service'

beforeEach(() => {
  vi.resetAllMocks()
})

describe('auth session claims', () => {
  it('refreshes role and organization from the current account', async () => {
    mocks.userFindUnique.mockResolvedValue({
      role: 'USER',
      organizationId: 'org-current',
    })

    const refreshed = await refreshAuthTokenClaims({
      id: 'user-1',
      sub: 'user-1',
      role: 'ADMIN',
      organizationId: 'org-old',
      accountType: 'STAFF',
    })

    expect(mocks.userFindUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { organizationId: true, role: true },
    })
    expect(refreshed).toMatchObject({
      id: 'user-1',
      organizationId: 'org-current',
      role: 'USER',
      accountType: 'STAFF',
    })
  })

  it('invalidates the token when its account has been deleted', async () => {
    mocks.userFindUnique.mockResolvedValue(null)

    await expect(refreshAuthTokenClaims({
      id: 'deleted-user',
      role: 'ADMIN',
      organizationId: 'org-1',
      accountType: 'STAFF',
    })).resolves.toBeNull()
  })

  it('loads the persisted identity for a newly authenticated user', async () => {
    mocks.userFindUnique.mockResolvedValue({
      role: 'TECH_ADMIN',
      organizationId: null,
    })

    const refreshed = await refreshAuthTokenClaims(
      { sub: 'technical-user' },
      { id: 'technical-user' },
    )

    expect(refreshed).toMatchObject({
      id: 'technical-user',
      organizationId: null,
      role: 'TECH_ADMIN',
      accountType: 'STAFF',
    })
  })
})

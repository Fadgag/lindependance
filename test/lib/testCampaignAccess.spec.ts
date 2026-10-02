import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  findUser: vi.fn(),
}))

vi.mock('@/auth', () => ({ auth: mocks.auth }))
vi.mock('@/lib/prisma', () => ({
  prisma: { user: { findUnique: mocks.findUser } },
}))

import { getTestCampaignAdminAccess } from '@/lib/testCampaignAccess'

beforeEach(() => {
  vi.resetAllMocks()
})

describe('getTestCampaignAdminAccess', () => {
  it('requires a live staff session and rechecks the provisioned role in the database', async () => {
    mocks.auth.mockResolvedValueOnce(null)
    expect(await getTestCampaignAdminAccess()).toEqual({ authorized: false, status: 401 })
    expect(mocks.findUser).not.toHaveBeenCalled()

    mocks.auth.mockResolvedValueOnce({
      user: { id: 'user-1', role: 'TECH_ADMIN', accountType: 'STAFF' },
    } as never)
    mocks.findUser.mockResolvedValueOnce({ role: 'ADMIN' })
    expect(await getTestCampaignAdminAccess()).toEqual({ authorized: false, status: 403 })
    expect(mocks.findUser).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { role: true },
    })
  })

  it('allows only a currently provisioned TECH_ADMIN staff account', async () => {
    mocks.auth.mockResolvedValueOnce({
      user: { id: 'tech-1', role: 'TECH_ADMIN', accountType: 'STAFF' },
    } as never)
    mocks.findUser.mockResolvedValueOnce({ role: 'TECH_ADMIN' })

    const access = await getTestCampaignAdminAccess()

    expect(access.authorized).toBe(true)
  })
})

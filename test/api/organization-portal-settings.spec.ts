import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaMock, authMock } = vi.hoisted(() => ({
  prismaMock: {
    organization: { findUnique: vi.fn(), update: vi.fn() },
  },
  authMock: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/auth', () => ({ auth: authMock }))

import { GET, PATCH } from '@/app/api/organization/portal/route'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

const staffSession = {
  user: { organizationId: 'org-1', accountType: 'STAFF' },
}

function patch(body: Record<string, unknown>) {
  return new Request('https://example.test/api/organization/portal', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(auth).mockResolvedValue(staffSession as never)
})

describe('/api/organization/portal', () => {
  it('returns portal settings scoped to the authenticated staff organization', async () => {
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({
      slug: 'atelier',
      portalEnabled: true,
      timezone: 'Europe/Paris',
    } as never)

    const response = await GET(new Request('https://example.test/api/organization/portal'))

    expect(await response.json()).toEqual({
      slug: 'atelier',
      portalEnabled: true,
      timezone: 'Europe/Paris',
    })
    expect(prisma.organization.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'org-1' },
    }))
  })

  it('updates only the authenticated organization and forbids activation without a slug', async () => {
    vi.mocked(prisma.organization.update).mockResolvedValue({
      slug: 'atelier',
      portalEnabled: true,
      timezone: 'Europe/Paris',
    } as never)

    const response = await PATCH(patch({
      slug: 'atelier',
      portalEnabled: true,
      timezone: 'Europe/Paris',
    }))

    expect(response.status).toBe(200)
    expect(prisma.organization.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'org-1' },
      data: { slug: 'atelier', portalEnabled: true, timezone: 'Europe/Paris' },
    }))

    const invalidResponse = await PATCH(patch({
      slug: null,
      portalEnabled: true,
      timezone: 'Europe/Paris',
    }))
    expect(invalidResponse.status).toBe(400)
  })

  it('rejects customer sessions and client-supplied organization ids', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { organizationId: 'org-1', accountType: 'CUSTOMER' },
    } as never)
    expect((await GET(new Request('https://example.test'))).status).toBe(403)

    const response = await PATCH(patch({
      slug: 'atelier',
      portalEnabled: false,
      timezone: 'Europe/Paris',
      organizationId: 'other-org',
    }))
    expect(response.status).toBe(400)
    expect(prisma.organization.update).not.toHaveBeenCalled()
  })
})

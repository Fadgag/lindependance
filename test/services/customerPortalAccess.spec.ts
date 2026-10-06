import { beforeEach, describe, expect, it, vi } from 'vitest'

const { findFirst, getSecret, verifySession } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  getSecret: vi.fn(),
  verifySession: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: { organization: { findFirst } },
}))

vi.mock('@/lib/customerPortalSecurity', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/customerPortalSecurity')>(),
  getCustomerPortalSecret: getSecret,
  verifyCustomerPortalSession: verifySession,
}))

import {
  findEnabledPortalOrganization,
  getCustomerPortalSession,
} from '@/services/customerPortal.service'

const session = {
  accountType: 'CUSTOMER' as const,
  organizationId: 'org-1',
  verifiedEmail: 'client@example.test',
  expiresAt: Date.now() + 60_000,
}

beforeEach(() => {
  vi.resetAllMocks()
  getSecret.mockReturnValue('test-secret')
  verifySession.mockReturnValue(session)
})

describe('customer portal availability', () => {
  it('only resolves an enabled organization with an active practitioner', async () => {
    findFirst.mockResolvedValue(null)

    await expect(findEnabledPortalOrganization('atelier')).resolves.toBeNull()
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        slug: 'atelier',
        portalEnabled: true,
        staff: { some: { active: true } },
      },
      select: {
        id: true,
        name: true,
        timezone: true,
        openingTime: true,
        closingTime: true,
      },
    })
  })

  it('rejects existing customer sessions when their organization has no active practitioner', async () => {
    findFirst.mockResolvedValue(null)
    const request = new Request('https://example.test/api/portail/rdv', {
      headers: { cookie: 'customer_portal_session=signed' },
    })

    await expect(getCustomerPortalSession(request)).resolves.toBeNull()
    expect(verifySession).toHaveBeenCalledWith('signed', 'test-secret')
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        id: 'org-1',
        portalEnabled: true,
        staff: { some: { active: true } },
      },
      select: {
        id: true,
        name: true,
        timezone: true,
        openingTime: true,
        closingTime: true,
      },
    })
  })

  it('keeps a customer session when the organization has an active practitioner', async () => {
    findFirst.mockResolvedValue({
      id: 'org-1',
      name: 'Atelier',
      timezone: 'Europe/Paris',
      openingTime: '09:00',
      closingTime: '18:00',
    })
    const request = new Request('https://example.test/api/portail/rdv', {
      headers: { cookie: 'customer_portal_session=signed' },
    })

    await expect(getCustomerPortalSession(request)).resolves.toEqual(session)
  })
})

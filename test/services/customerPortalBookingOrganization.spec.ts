import { beforeEach, describe, expect, it, vi } from 'vitest'

const { findFirstMock } = vi.hoisted(() => ({
  findFirstMock: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: { organization: { findFirst: findFirstMock } },
}))

import { findEnabledPortalBookingOrganization } from '@/services/customerPortal.service'

beforeEach(() => {
  vi.resetAllMocks()
})

describe('findEnabledPortalBookingOrganization', () => {
  it('returns public brand details only for an enabled organization slug', async () => {
    findFirstMock.mockResolvedValue({
      name: 'Salon Élise',
      timezone: 'Europe/Paris',
      logoDataUrl: 'data:image/webp;base64,AA==',
      logoShape: 'circle',
      logoSize: 'large',
    })

    await expect(findEnabledPortalBookingOrganization('salon-elise')).resolves.toEqual({
      name: 'Salon Élise',
      timezone: 'Europe/Paris',
      logoDataUrl: 'data:image/webp;base64,AA==',
      logoShape: 'circle',
      logoSize: 'large',
    })
    expect(findFirstMock).toHaveBeenCalledWith({
      where: { slug: 'salon-elise', portalEnabled: true },
      select: {
        name: true,
        timezone: true,
        logoDataUrl: true,
        logoShape: true,
        logoSize: true,
      },
    })
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { findFirstMock } = vi.hoisted(() => ({
  findFirstMock: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: { organization: { findFirst: findFirstMock } },
}))

import {
  findEnabledPortalAppointmentOrganization,
  findEnabledPortalBookingOrganization,
} from '@/services/customerPortal.service'

beforeEach(() => {
  vi.resetAllMocks()
})

describe('findEnabledPortalBookingOrganization', () => {
  it('returns public brand details only for an enabled organization slug', async () => {
    findFirstMock.mockResolvedValue({
      name: 'Salon Élise',
      timezone: 'Europe/Paris',
      portalContactPhone: '01 23 45 67 89',
      portalContactEmail: 'contact@salon-elise.fr',
      logoDataUrl: 'data:image/webp;base64,AA==',
      logoShape: 'circle',
      logoSize: 'large',
      portalNameFont: 'notoSerif',
      portalNameSize: 22,
      portalNameColor: 'emerald',
      portalNameWeight: 'bold',
      portalNameAlignment: 'right',
      portalLogoSize: 120,
    })

    await expect(findEnabledPortalBookingOrganization('salon-elise')).resolves.toEqual({
      name: 'Salon Élise',
      timezone: 'Europe/Paris',
      portalContactPhone: '01 23 45 67 89',
      portalContactEmail: 'contact@salon-elise.fr',
      logoDataUrl: 'data:image/webp;base64,AA==',
      logoShape: 'circle',
      logoSize: 'large',
      portalNameFont: 'notoSerif',
      portalNameSize: 22,
      portalNameColor: 'emerald',
      portalNameWeight: 'bold',
      portalNameAlignment: 'right',
      portalLogoSize: 120,
    })
    expect(findFirstMock).toHaveBeenCalledWith({
      where: {
        slug: 'salon-elise',
        portalEnabled: true,
        staff: { some: { active: true } },
      },
      select: {
        name: true,
        timezone: true,
        portalContactPhone: true,
        portalContactEmail: true,
        logoDataUrl: true,
        logoShape: true,
        logoSize: true,
        portalNameFont: true,
        portalNameSize: true,
        portalNameColor: true,
        portalNameWeight: true,
        portalNameAlignment: true,
        portalLogoSize: true,
      },
    })
  })

  it('returns public brand details for the enabled appointments portal only', async () => {
    findFirstMock.mockResolvedValue({
      name: 'Salon Élise',
      timezone: 'Europe/Paris',
      logoDataUrl: 'data:image/webp;base64,AA==',
      logoShape: 'square',
      portalNameFont: 'manrope',
      portalNameSize: 18,
      portalNameColor: 'charcoal',
      portalNameWeight: 'semibold',
      portalNameAlignment: 'center',
      portalLogoSize: 160,
    })

    await expect(findEnabledPortalAppointmentOrganization('salon-elise')).resolves.toEqual({
      name: 'Salon Élise',
      timezone: 'Europe/Paris',
      logoDataUrl: 'data:image/webp;base64,AA==',
      logoShape: 'square',
      portalNameFont: 'manrope',
      portalNameSize: 18,
      portalNameColor: 'charcoal',
      portalNameWeight: 'semibold',
      portalNameAlignment: 'center',
      portalLogoSize: 160,
    })
    expect(findFirstMock).toHaveBeenCalledWith({
      where: {
        slug: 'salon-elise',
        portalEnabled: true,
        staff: { some: { active: true } },
      },
      select: {
        name: true,
        timezone: true,
        logoDataUrl: true,
        logoShape: true,
        portalNameFont: true,
        portalNameSize: true,
        portalNameColor: true,
        portalNameWeight: true,
        portalNameAlignment: true,
        portalLogoSize: true,
      },
    })
  })
})

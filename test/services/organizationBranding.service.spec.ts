import { beforeEach, describe, expect, it, vi } from 'vitest'

const { findUniqueMock, updateMock } = vi.hoisted(() => ({
  findUniqueMock: vi.fn(),
  updateMock: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: { organization: { findUnique: findUniqueMock, update: updateMock } },
}))

import {
  getOrganizationBranding,
  updateOrganizationBranding,
} from '@/services/organizationBranding.service'

const brandingRecord = {
  name: 'Studio Étoile',
  logoDataUrl: null,
  logoShape: 'circle',
  logoSize: 'medium',
  showNameWithLogo: false,
  portalNameFont: 'manrope',
  portalNameSize: 18,
  portalNameColor: 'charcoal',
  portalNameWeight: 'semibold',
  portalNameAlignment: 'left',
  portalLogoSize: 48,
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('organizationBranding.service', () => {
  it('returns branding from the requested organization', async () => {
    findUniqueMock.mockResolvedValue(brandingRecord)

    await expect(getOrganizationBranding('org-1')).resolves.toEqual({
      organizationName: 'Studio Étoile',
      logoDataUrl: null,
      logoShape: 'circle',
      logoSize: 'medium',
      showNameWithLogo: false,
      portalNameFont: 'manrope',
      portalNameSize: 18,
      portalNameColor: 'charcoal',
      portalNameWeight: 'semibold',
      portalNameAlignment: 'left',
      portalLogoSize: 48,
    })
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: 'org-1' },
      select: {
        name: true,
        logoDataUrl: true,
        logoShape: true,
        logoSize: true,
        showNameWithLogo: true,
        portalNameFont: true,
        portalNameSize: true,
        portalNameColor: true,
        portalNameWeight: true,
        portalNameAlignment: true,
        portalLogoSize: true,
      },
    })
  })

  it('maps the editable name to Organization.name and updates only that organization', async () => {
    updateMock.mockResolvedValue({
      ...brandingRecord,
      name: 'Nouveau salon',
      logoSize: 'large',
      showNameWithLogo: true,
      portalNameFont: 'notoSerif',
      portalNameSize: 22,
      portalNameColor: 'emerald',
      portalNameWeight: 'bold',
      portalNameAlignment: 'right',
      portalLogoSize: 120,
    })

    await expect(updateOrganizationBranding('org-1', {
      organizationName: 'Nouveau salon',
      showNameWithLogo: true,
      logoSize: 'large',
      portalNameFont: 'notoSerif',
      portalNameSize: 22,
      portalNameColor: 'emerald',
      portalNameWeight: 'bold',
      portalNameAlignment: 'right',
      portalLogoSize: 120,
    })).resolves.toEqual({
      organizationName: 'Nouveau salon',
      logoDataUrl: null,
      logoShape: 'circle',
      logoSize: 'large',
      showNameWithLogo: true,
      portalNameFont: 'notoSerif',
      portalNameSize: 22,
      portalNameColor: 'emerald',
      portalNameWeight: 'bold',
      portalNameAlignment: 'right',
      portalLogoSize: 120,
    })
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 'org-1' },
      data: {
        showNameWithLogo: true,
        logoSize: 'large',
        portalNameFont: 'notoSerif',
        portalNameSize: 22,
        portalNameColor: 'emerald',
        portalNameWeight: 'bold',
        portalNameAlignment: 'right',
        portalLogoSize: 120,
        name: 'Nouveau salon',
      },
      select: {
        name: true,
        logoDataUrl: true,
        logoShape: true,
        logoSize: true,
        showNameWithLogo: true,
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

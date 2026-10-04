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
  showNameWithLogo: false,
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
      showNameWithLogo: false,
    })
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: 'org-1' },
      select: { name: true, logoDataUrl: true, logoShape: true, showNameWithLogo: true },
    })
  })

  it('maps the editable name to Organization.name and updates only that organization', async () => {
    updateMock.mockResolvedValue({
      ...brandingRecord,
      name: 'Nouveau salon',
      showNameWithLogo: true,
    })

    await expect(updateOrganizationBranding('org-1', {
      organizationName: 'Nouveau salon',
      showNameWithLogo: true,
    })).resolves.toEqual({
      organizationName: 'Nouveau salon',
      logoDataUrl: null,
      logoShape: 'circle',
      showNameWithLogo: true,
    })
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 'org-1' },
      data: { showNameWithLogo: true, name: 'Nouveau salon' },
      select: { name: true, logoDataUrl: true, logoShape: true, showNameWithLogo: true },
    })
  })
})

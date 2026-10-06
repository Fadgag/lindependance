import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaMock, transactionMock } = vi.hoisted(() => {
  const organization = {
    findUnique: vi.fn(),
    update: vi.fn(),
  }
  const staff = { count: vi.fn() }
  const transactionMock = { organization, staff }
  return {
    prismaMock: { organization, staff, $transaction: vi.fn() },
    transactionMock,
  }
})

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))

import {
  getOrganizationPortalSettings,
  updateOrganizationPortalSettings,
} from '@/services/customerPortalSettings.service'
import { prisma } from '@/lib/prisma'

const settings = {
  slug: 'atelier',
  portalEnabled: true,
  timezone: 'Europe/Paris',
  portalContactPhone: null,
  portalContactEmail: 'contact@atelier.fr',
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(prisma.$transaction).mockImplementation(async (operation) => (
    operation(transactionMock as never)
  ))
})

describe('customer portal settings service', () => {
  it('returns settings and the authenticated organization active practitioner count', async () => {
    vi.mocked(prisma.organization.findUnique).mockResolvedValue(settings as never)
    vi.mocked(prisma.staff.count).mockResolvedValue(2)

    await expect(getOrganizationPortalSettings('org-1')).resolves.toEqual({
      ...settings,
      activePractitionerCount: 2,
    })
    expect(prisma.organization.findUnique).toHaveBeenCalledWith({
      where: { id: 'org-1' },
      select: {
        slug: true,
        portalEnabled: true,
        timezone: true,
        portalContactPhone: true,
        portalContactEmail: true,
      },
    })
    expect(prisma.staff.count).toHaveBeenCalledWith({
      where: { organizationId: 'org-1', active: true },
    })
  })

  it('refuses activation when the organization has no active practitioner', async () => {
    vi.mocked(transactionMock.organization.findUnique).mockResolvedValue({
      id: 'org-1',
      portalEnabled: false,
    } as never)
    vi.mocked(transactionMock.staff.count).mockResolvedValue(0)

    await expect(updateOrganizationPortalSettings({
      organizationId: 'org-1',
      settings,
    })).resolves.toEqual({ status: 'practitioner_required' })
    expect(transactionMock.organization.update).not.toHaveBeenCalled()
  })

  it('requires public contact details before first activation', async () => {
    vi.mocked(transactionMock.organization.findUnique).mockResolvedValue({
      id: 'org-1',
      portalEnabled: false,
    } as never)
    vi.mocked(transactionMock.staff.count).mockResolvedValue(1)

    await expect(updateOrganizationPortalSettings({
      organizationId: 'org-1',
      settings: { ...settings, portalContactPhone: null, portalContactEmail: null },
    })).resolves.toEqual({ status: 'contact_required' })
    expect(transactionMock.organization.update).not.toHaveBeenCalled()
  })

  it('updates settings transactionally when an active practitioner and public contact exist', async () => {
    vi.mocked(transactionMock.organization.findUnique).mockResolvedValue({
      id: 'org-1',
      portalEnabled: false,
    } as never)
    vi.mocked(transactionMock.staff.count).mockResolvedValue(1)
    vi.mocked(transactionMock.organization.update).mockResolvedValue(settings as never)

    await expect(updateOrganizationPortalSettings({
      organizationId: 'org-1',
      settings,
    })).resolves.toEqual({
      status: 'updated',
      settings: { ...settings, activePractitionerCount: 1 },
    })
    expect(prisma.$transaction).toHaveBeenCalledOnce()
    expect(transactionMock.organization.update).toHaveBeenCalledWith({
      where: { id: 'org-1' },
      data: settings,
      select: {
        slug: true,
        portalEnabled: true,
        timezone: true,
        portalContactPhone: true,
        portalContactEmail: true,
      },
    })
  })
})

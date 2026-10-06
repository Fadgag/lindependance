import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaMock, staffMock, organizationMock, userMock, transactionMock, sendPortalDisabledEmailMock, loggerMock } = vi.hoisted(() => {
  const staffMock = {
    findMany: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
  }
  const organizationMock = { updateMany: vi.fn(), findUnique: vi.fn() }
  const userMock = { findMany: vi.fn() }
  const transactionMock = {
    staff: staffMock,
    appointment: { count: vi.fn() },
    organization: organizationMock,
  }
  return {
    prismaMock: {
      staff: staffMock,
      organization: organizationMock,
      user: userMock,
      $transaction: vi.fn(),
    },
    staffMock,
    organizationMock,
    userMock,
    transactionMock,
    sendPortalDisabledEmailMock: vi.fn(),
    loggerMock: { error: vi.fn(), warn: vi.fn() },
  }
})

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/services/customerPortalEmail.service', () => ({
  sendCustomerPortalDisabledEmail: sendPortalDisabledEmailMock,
}))
vi.mock('@/lib/logger', () => ({ logger: loggerMock }))

import { prisma } from '@/lib/prisma'
import {
  archiveOrganizationStaff,
  listOrganizationStaff,
  updateOrganizationStaff,
} from '@/services/staff.service'

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(prisma.$transaction).mockImplementation(async (operation) => (
    operation(transactionMock as never)
  ))
  vi.mocked(staffMock.count).mockResolvedValue(1)
  vi.mocked(organizationMock.updateMany).mockResolvedValue({ count: 0 })
  vi.mocked(organizationMock.findUnique).mockResolvedValue({ name: 'Atelier' } as never)
  vi.mocked(userMock.findMany).mockResolvedValue([{ email: 'admin@example.com' }] as never)
  vi.mocked(sendPortalDisabledEmailMock).mockResolvedValue(undefined)
})

describe('organization practitioner service', () => {
  it('lists active and archived practitioners only within the organization', async () => {
    vi.mocked(staffMock.findMany).mockResolvedValue([])

    await listOrganizationStaff('org-1')

    expect(staffMock.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { organizationId: 'org-1' },
      select: { id: true, firstName: true, lastName: true, active: true },
    }))
  })

  it('updates practitioner details and optional active status within the organization', async () => {
    vi.mocked(staffMock.findFirst).mockResolvedValue({ id: 'staff-1', active: true } as never)
    vi.mocked(staffMock.updateMany).mockResolvedValue({ count: 1 })

    const updated = await updateOrganizationStaff({
      id: 'staff-1',
      organizationId: 'org-1',
      firstName: 'Camille',
      lastName: 'Martin',
    })

    expect(updated).toEqual({
      status: 'updated',
      portalDisabled: false,
      notificationSent: null,
    })
    expect(staffMock.updateMany).toHaveBeenCalledWith({
      where: { id: 'staff-1', organizationId: 'org-1' },
      data: { firstName: 'Camille', lastName: 'Martin' },
    })
  })

  it('requires explicit confirmation when linked appointments exist', async () => {
    vi.mocked(staffMock.findFirst).mockResolvedValue({ id: 'staff-1' } as never)
    vi.mocked(transactionMock.appointment.count).mockResolvedValue(3)

    const result = await archiveOrganizationStaff({
      id: 'staff-1',
      organizationId: 'org-1',
    })

    expect(result).toEqual({ status: 'confirmation_required', appointmentCount: 3 })
    expect(transactionMock.appointment.count).toHaveBeenCalledWith({
      where: { staffId: 'staff-1', organizationId: 'org-1' },
    })
    expect(staffMock.updateMany).not.toHaveBeenCalled()
  })

  it('archives immediately when there are no linked appointments', async () => {
    vi.mocked(staffMock.findFirst).mockResolvedValue({ id: 'staff-1' } as never)
    vi.mocked(transactionMock.appointment.count).mockResolvedValue(0)
    vi.mocked(staffMock.updateMany).mockResolvedValue({ count: 1 })

    const result = await archiveOrganizationStaff({
      id: 'staff-1',
      organizationId: 'org-1',
    })

    expect(result).toEqual({
      status: 'archived',
      appointmentCount: 0,
      portalDisabled: false,
      notificationSent: null,
    })
    expect(staffMock.updateMany).toHaveBeenCalledWith({
      where: { id: 'staff-1', organizationId: 'org-1', active: true },
      data: { active: false },
    })
  })

  it('archives after confirming the current linked appointment count', async () => {
    vi.mocked(staffMock.findFirst).mockResolvedValue({ id: 'staff-1' } as never)
    vi.mocked(transactionMock.appointment.count).mockResolvedValue(3)
    vi.mocked(staffMock.updateMany).mockResolvedValue({ count: 1 })

    const result = await archiveOrganizationStaff({
      id: 'staff-1',
      organizationId: 'org-1',
      expectedAppointmentCount: 3,
    })

    expect(result).toEqual({
      status: 'archived',
      appointmentCount: 3,
      portalDisabled: false,
      notificationSent: null,
    })
    expect(staffMock.updateMany).toHaveBeenCalledWith({
      where: { id: 'staff-1', organizationId: 'org-1', active: true },
      data: { active: false },
    })
  })

  it('disables the portal and notifies organization admins when archiving the last active practitioner', async () => {
    vi.mocked(staffMock.findFirst).mockResolvedValue({ id: 'staff-1' } as never)
    vi.mocked(transactionMock.appointment.count).mockResolvedValue(0)
    vi.mocked(staffMock.updateMany).mockResolvedValue({ count: 1 })
    vi.mocked(staffMock.count).mockResolvedValue(0)
    vi.mocked(organizationMock.updateMany).mockResolvedValue({ count: 1 })

    await expect(archiveOrganizationStaff({
      id: 'staff-1',
      organizationId: 'org-1',
    })).resolves.toEqual({
      status: 'archived',
      appointmentCount: 0,
      portalDisabled: true,
      notificationSent: true,
    })

    expect(organizationMock.updateMany).toHaveBeenCalledWith({
      where: { id: 'org-1', portalEnabled: true },
      data: { portalEnabled: false },
    })
    expect(userMock.findMany).toHaveBeenCalledWith({
      where: { organizationId: 'org-1', role: 'ADMIN', email: { not: null } },
      select: { email: true },
    })
    expect(sendPortalDisabledEmailMock).toHaveBeenCalledWith({
      to: 'admin@example.com',
      organizationName: 'Atelier',
    })
  })

  it('disables the portal and notifies admins when the last practitioner is deactivated via update', async () => {
    vi.mocked(staffMock.findFirst).mockResolvedValue({ id: 'staff-1', active: true } as never)
    vi.mocked(staffMock.updateMany).mockResolvedValue({ count: 1 })
    vi.mocked(staffMock.count).mockResolvedValue(0)
    vi.mocked(organizationMock.updateMany).mockResolvedValue({ count: 1 })

    const result = await updateOrganizationStaff({
      id: 'staff-1',
      organizationId: 'org-1',
      firstName: 'Camille',
      lastName: 'Martin',
      active: false,
    })

    expect(result).toEqual({
      status: 'updated',
      portalDisabled: true,
      notificationSent: true,
    })
    expect(sendPortalDisabledEmailMock).toHaveBeenCalledWith({
      to: 'admin@example.com',
      organizationName: 'Atelier',
    })
  })

  it('keeps the portal disabled and logs when the notification email fails', async () => {
    vi.mocked(staffMock.findFirst).mockResolvedValue({ id: 'staff-1' } as never)
    vi.mocked(transactionMock.appointment.count).mockResolvedValue(0)
    vi.mocked(staffMock.updateMany).mockResolvedValue({ count: 1 })
    vi.mocked(staffMock.count).mockResolvedValue(0)
    vi.mocked(organizationMock.updateMany).mockResolvedValue({ count: 1 })
    vi.mocked(sendPortalDisabledEmailMock).mockRejectedValue(new Error('Mail unavailable'))

    await expect(archiveOrganizationStaff({
      id: 'staff-1',
      organizationId: 'org-1',
    })).resolves.toMatchObject({
      status: 'archived',
      portalDisabled: true,
      notificationSent: false,
    })
    expect(organizationMock.updateMany).toHaveBeenCalled()
    expect(loggerMock.error).toHaveBeenCalledWith(
      'Failed to notify organization admin about portal deactivation',
      expect.objectContaining({ organizationId: 'org-1', email: 'admin@example.com' }),
    )
  })

  it('asks for renewed confirmation if the linked appointment count changes', async () => {
    vi.mocked(staffMock.findFirst).mockResolvedValue({ id: 'staff-1' } as never)
    vi.mocked(transactionMock.appointment.count).mockResolvedValue(4)

    const result = await archiveOrganizationStaff({
      id: 'staff-1',
      organizationId: 'org-1',
      expectedAppointmentCount: 3,
    })

    expect(result).toEqual({ status: 'confirmation_required', appointmentCount: 4 })
    expect(staffMock.updateMany).not.toHaveBeenCalled()
  })
})

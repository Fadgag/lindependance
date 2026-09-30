import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaMock, staffMock, transactionMock } = vi.hoisted(() => {
  const staffMock = {
    findMany: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
    findFirst: vi.fn(),
  }
  const transactionMock = {
    staff: staffMock,
    appointment: { count: vi.fn() },
  }
  return {
    prismaMock: {
      staff: staffMock,
      $transaction: vi.fn(),
    },
    staffMock,
    transactionMock,
  }
})

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))

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
    vi.mocked(staffMock.updateMany).mockResolvedValue({ count: 1 })

    const updated = await updateOrganizationStaff({
      id: 'staff-1',
      organizationId: 'org-1',
      firstName: 'Camille',
      lastName: 'Martin',
    })

    expect(updated).toBe(true)
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

    expect(result).toEqual({ status: 'archived', appointmentCount: 0 })
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

    expect(result).toEqual({ status: 'archived', appointmentCount: 3 })
    expect(staffMock.updateMany).toHaveBeenCalledWith({
      where: { id: 'staff-1', organizationId: 'org-1', active: true },
      data: { active: false },
    })
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

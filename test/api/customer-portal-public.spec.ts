import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaMock, portalServiceMock } = vi.hoisted(() => ({
  prismaMock: {
    service: { findMany: vi.fn(), findFirst: vi.fn() },
    staff: { findMany: vi.fn() },
    customer: { findMany: vi.fn() },
    appointment: { findMany: vi.fn() },
    unavailability: { findMany: vi.fn() },
  },
  portalServiceMock: {
    findEnabledPortalOrganization: vi.fn(),
    getCustomerPortalSession: vi.fn(),
  },
}))

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/services/customerPortal.service', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/services/customerPortal.service')>(),
  ...portalServiceMock,
}))

import { GET as getServices } from '@/app/api/portail/[organizationSlug]/services/route'
import { GET as getStaff } from '@/app/api/portail/[organizationSlug]/praticiens/route'
import { GET as getCustomers } from '@/app/api/portail/[organizationSlug]/customers/route'
import { GET as getSlots } from '@/app/api/portail/[organizationSlug]/creneaux/route'
import { prisma } from '@/lib/prisma'
import {
  findEnabledPortalOrganization,
  getCustomerPortalSession,
} from '@/services/customerPortal.service'

const organization = {
  id: 'org-internal',
  name: 'Atelier',
  timezone: 'Europe/Paris',
  openingTime: '09:00',
  closingTime: '18:00',
}
const routeContext = { params: Promise.resolve({ organizationSlug: 'atelier' }) }

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(findEnabledPortalOrganization).mockResolvedValue(organization)
  vi.mocked(getCustomerPortalSession).mockResolvedValue({
    accountType: 'CUSTOMER',
    organizationId: 'org-internal',
    verifiedEmail: 'parent@example.com',
    expiresAt: Date.now() + 60_000,
  })
})

describe('public customer portal reads', () => {
  it('returns only a minimal projection of the organization services', async () => {
    vi.mocked(prisma.service.findMany).mockResolvedValue([{
      id: 'service-1',
      name: 'Coupe',
      durationMinutes: 45,
      price: 50,
      color: '#abc',
      organizationId: 'org-internal',
    }] as never)

    const response = await getServices(new Request('https://example.test'), routeContext)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual([{
      id: 'service-1',
      name: 'Coupe',
      durationMinutes: 45,
      price: 50,
      color: '#abc',
    }])
    expect(prisma.service.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { organizationId: 'org-internal' },
    }))
  })

  it('returns only practitioner identity needed for selection', async () => {
    vi.mocked(prisma.staff.findMany).mockResolvedValue([{
      id: 'staff-1',
      firstName: 'Alex',
      lastName: 'Martin',
      organizationId: 'org-internal',
      active: true,
    }] as never)

    const response = await getStaff(new Request('https://example.test'), routeContext)

    expect(await response.json()).toEqual([{ id: 'staff-1', firstName: 'Alex', lastName: 'Martin' }])
    expect(prisma.staff.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { organizationId: 'org-internal', active: true },
    }))
  })

  it('calculates slot end times from the stored service duration and auto-selects one practitioner', async () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    vi.mocked(prisma.service.findFirst).mockResolvedValue({
      id: 'service-1',
      name: 'Coupe',
      durationMinutes: 60,
    } as never)
    vi.mocked(prisma.staff.findMany).mockResolvedValue([{ id: 'staff-1' }] as never)
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.unavailability.findMany).mockResolvedValue([] as never)
    const response = await getSlots(new Request(
      `https://example.test?serviceId=service-1&date=${futureDate}`,
    ), routeContext)

    expect(prisma.staff.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { organizationId: 'org-internal', active: true },
    }))
    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload.timezone).toBe('Europe/Paris')
    expect(payload.slots[0]).toEqual({
      start: expect.any(String),
      end: expect.any(String),
    })
    expect(new Date(payload.slots[0].end).getTime() - new Date(payload.slots[0].start).getTime())
      .toBe(60 * 60 * 1000)
  })

  it('returns only names of fiches linked to the verified email and organization', async () => {
    vi.mocked(prisma.customer.findMany).mockResolvedValue([{
      id: 'customer-1',
      firstName: 'Camille',
      lastName: 'Martin',
      email: 'parent@example.com',
      phone: 'private',
      Note: 'private',
    }] as never)

    const response = await getCustomers(new Request('https://example.test'), routeContext)

    expect(await response.json()).toEqual([{ id: 'customer-1', firstName: 'Camille', lastName: 'Martin' }])
    expect(prisma.customer.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { organizationId: 'org-internal', email: 'parent@example.com' },
    }))
  })

})

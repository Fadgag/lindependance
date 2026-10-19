import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  organizationCreate: vi.fn(),
  serviceCreate: vi.fn(),
  staffCreate: vi.fn(),
  customerCreate: vi.fn(),
  appointmentCreate: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: { $transaction: mocks.transaction },
}))

import { provisionTestSalon } from '@/services/testSalonProvisioning.service'

describe('test salon provisioning service', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.transaction.mockImplementation(async (callback) => callback({
      organization: { create: mocks.organizationCreate },
      service: { create: mocks.serviceCreate },
      staff: { create: mocks.staffCreate },
      customer: { create: mocks.customerCreate },
      appointment: { create: mocks.appointmentCreate },
    }))
    mocks.organizationCreate.mockResolvedValue({
      id: 'test-organization',
      name: 'Salon de test salon-test-fixture',
    })
    mocks.serviceCreate.mockResolvedValue({ id: 'test-service' })
    mocks.staffCreate.mockResolvedValue({ id: 'test-staff' })
    mocks.customerCreate.mockResolvedValue({ id: 'test-customer' })
    mocks.appointmentCreate.mockResolvedValue({ id: 'test-appointment' })
  })

  it('creates a portal-ready synthetic salon and scopes each fixture record to it', async () => {
    const result = await provisionTestSalon()

    expect(result).toEqual({
      id: 'test-organization',
      name: 'Salon de test salon-test-fixture',
      slug: expect.stringMatching(/^salon-test-/),
      customerEmail: expect.stringMatching(/^client-salon-test-.+@example\.invalid$/),
    })
    expect(mocks.organizationCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: expect.stringMatching(/^Salon de test salon-test-/),
        slug: result.slug,
        portalEnabled: true,
      }),
      select: { id: true, name: true },
    })
    expect(mocks.serviceCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ organizationId: result.id }),
    }))
    expect(mocks.staffCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ organizationId: result.id, active: true }),
    }))
    expect(mocks.customerCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        organizationId: result.id,
        email: result.customerEmail,
      }),
    }))
    expect(mocks.appointmentCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        organizationId: result.id,
        serviceId: 'test-service',
        staffId: 'test-staff',
        customerId: 'test-customer',
      }),
    }))
    expect(mocks.transaction).toHaveBeenCalledOnce()
  })
})

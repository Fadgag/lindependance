import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  organizationCreate: vi.fn(),
  serviceCreate: vi.fn(),
  staffCreate: vi.fn(),
  customerCreate: vi.fn(),
  appointmentCreate: vi.fn(),
  userFindUnique: vi.fn(),
  userCreate: vi.fn(),
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
      user: { findUnique: mocks.userFindUnique, create: mocks.userCreate },
    }))
    mocks.organizationCreate.mockResolvedValue({
      id: 'test-organization',
      name: 'Salon de test salon-test-fixture',
    })
    mocks.serviceCreate.mockResolvedValue({ id: 'test-service' })
    mocks.staffCreate.mockResolvedValue({ id: 'test-staff' })
    mocks.customerCreate.mockResolvedValue({ id: 'test-customer' })
    mocks.appointmentCreate.mockResolvedValue({ id: 'test-appointment' })
    mocks.userCreate.mockResolvedValue({
      email: 'staff@example.com',
      role: 'USER',
    })
    mocks.userFindUnique.mockResolvedValue(null)
  })

  it('creates a portal-ready salon and a passwordless staff account scoped to it', async () => {
    const result = await provisionTestSalon({
      email: 'staff@example.com',
      role: 'USER',
    })

    expect(result).toEqual({
      kind: 'created',
      salon: {
        id: 'test-organization',
        name: 'Salon de test salon-test-fixture',
        slug: expect.stringMatching(/^salon-test-/),
        customerEmail: expect.stringMatching(/^client-salon-test-.+@example\.invalid$/),
        staffAccount: {
          email: 'staff@example.com',
          role: 'USER',
        },
      },
    })
    if (result.kind !== 'created') throw new Error('Expected the test salon to be created')
    const salon = result.salon
    expect(mocks.organizationCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: expect.stringMatching(/^Salon de test salon-test-/),
        slug: salon?.slug,
        portalEnabled: true,
      }),
      select: { id: true, name: true },
    })
    expect(mocks.serviceCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ organizationId: salon?.id }),
    }))
    expect(mocks.staffCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ organizationId: salon?.id, active: true }),
    }))
    expect(mocks.customerCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        organizationId: salon.id,
        email: salon?.customerEmail,
      }),
    }))
    expect(mocks.appointmentCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        organizationId: salon?.id,
        serviceId: 'test-service',
        staffId: 'test-staff',
        customerId: 'test-customer',
      }),
    }))
    expect(mocks.userCreate).toHaveBeenCalledWith({
      data: {
        email: 'staff@example.com',
        role: 'USER',
        organizationId: salon.id,
        hashedPassword: null,
      },
      select: { id: true },
    })
    expect(mocks.transaction).toHaveBeenCalledOnce()
  })

  it('provisions an explicitly selected ADMIN without granting TECH_ADMIN', async () => {
    mocks.userCreate.mockResolvedValueOnce({
      email: 'admin@example.com',
      role: 'ADMIN',
    })

    const result = await provisionTestSalon({
      email: 'admin@example.com',
      role: 'ADMIN',
    })

    expect(result.kind).toBe('created')
    expect(result.kind === 'created' ? result.salon.staffAccount.role : 'USER').toBe('ADMIN')
    expect(mocks.userCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ role: 'ADMIN' }),
    }))
  })

  it('reports an existing account address without creating another salon', async () => {
    mocks.userFindUnique.mockResolvedValueOnce({ id: 'existing-user' })

    await expect(provisionTestSalon({
      email: 'staff@example.com',
      role: 'USER',
    })).resolves.toEqual({ kind: 'email_exists' })
    expect(mocks.organizationCreate).not.toHaveBeenCalled()
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaMock, authMock } = vi.hoisted(() => ({
  prismaMock: {
    customer: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
  },
  authMock: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/auth', () => ({ auth: authMock }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { createCustomerAndReturn } from '@/actions/createCustomerAndReturn'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(auth).mockResolvedValue({ user: { organizationId: 'org-1' } } as never)
  vi.mocked(prisma.customer.create).mockResolvedValue({
    id: 'customer-2',
    firstName: 'Camille',
    lastName: 'Martin',
    phone: '0600000000',
  } as never)
})

describe('createCustomerAndReturn', () => {
  it('creates a new fiche even when another customer has the same phone', async () => {
    vi.mocked(prisma.customer.findFirst).mockResolvedValue({
      id: 'customer-1',
      firstName: 'Léa',
      lastName: 'Martin',
      phone: '0600000000',
    } as never)

    const result = await createCustomerAndReturn({
      firstName: 'Camille',
      lastName: 'Martin',
      phone: '0600000000',
    })

    expect(result).toEqual({
      success: true,
      customer: {
        id: 'customer-2',
        firstName: 'Camille',
        lastName: 'Martin',
        phone: '0600000000',
      },
    })
    expect(prisma.customer.findFirst).not.toHaveBeenCalled()
  })
})

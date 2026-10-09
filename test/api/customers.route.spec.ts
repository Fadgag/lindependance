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

import { POST } from '@/app/api/customers/route'
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

describe('POST /api/customers', () => {
  it('creates a distinct customer even when the phone is already used in the organization', async () => {
    vi.mocked(prisma.customer.findFirst).mockResolvedValue({
      id: 'customer-1',
      firstName: 'Léa',
      lastName: 'Martin',
      phone: '0600000000',
    } as never)

    const response = await POST(new Request('https://example.test/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'Camille',
        lastName: 'Martin',
        phone: '0600000000',
      }),
    }))

    expect(response.status).toBe(200)
    expect(prisma.customer.findFirst).not.toHaveBeenCalled()
    expect(prisma.customer.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        firstName: 'Camille',
        phone: '0600000000',
        organizationId: 'org-1',
      }),
    }))
  })
})

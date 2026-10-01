import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaMock, authMock } = vi.hoisted(() => ({
  prismaMock: {
    customer: {
      create: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  authMock: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/auth', () => ({ auth: authMock }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { POST, PUT } from '@/app/api/customers/route'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

const staffSession = { user: { organizationId: 'org-1', accountType: 'STAFF' } }

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(auth).mockResolvedValue(staffSession as never)
})

describe('staff-managed customer portal email', () => {
  it('persists the normalized contact email when staff creates a fiche', async () => {
    vi.mocked(prisma.customer.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.customer.create).mockResolvedValue({
      id: 'customer-1',
      firstName: 'Camille',
      lastName: 'Martin',
      email: 'parent@example.com',
    } as never)

    const response = await POST(new Request('https://example.test/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'Camille',
        lastName: 'Martin',
        email: ' Parent@Example.com ',
      }),
    }))

    expect(response.status).toBe(200)
    expect(prisma.customer.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        email: 'parent@example.com',
        organizationId: 'org-1',
      }),
    }))
  })

  it('invalidates outstanding OTPs atomically when staff changes the fiche email', async () => {
    const transaction = {
      customer: {
        findFirst: vi.fn().mockResolvedValue({ email: 'old@example.com' }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      customerEmailOtp: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    }
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      return callback(transaction as never)
    })
    vi.mocked(prisma.customer.findFirst).mockResolvedValue({
      id: 'customer-1',
      firstName: 'Camille',
      lastName: 'Martin',
      email: 'new@example.com',
      appointments: [],
    } as never)

    const response = await PUT(new Request('https://example.test/api/customers', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'customer-1', email: 'New@Example.com' }),
    }))

    expect(response.status).toBe(200)
    expect(transaction.customerEmailOtp.updateMany).toHaveBeenCalledWith({
      where: {
        organizationId: 'org-1',
        email: 'old@example.com',
        consumedAt: null,
      },
      data: { consumedAt: expect.any(Date) },
    })
    expect(transaction.customer.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'customer-1', organizationId: 'org-1' },
      data: { email: 'new@example.com' },
    }))
  })
})

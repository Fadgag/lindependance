import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  userCreate: vi.fn(),
  hash: vi.fn(),
}))

vi.mock('@/auth', () => ({ auth: mocks.auth }))
vi.mock('@/lib/prisma', () => ({
  prisma: { user: { create: mocks.userCreate } },
}))
vi.mock('bcryptjs', () => ({ default: { hash: mocks.hash } }))
vi.mock('@/lib/crypto', () => ({ BCRYPT_ROUNDS: 12 }))

import { POST } from '@/app/api/users/route'

beforeEach(() => {
  vi.resetAllMocks()
  mocks.auth.mockResolvedValue({
    user: { role: 'ADMIN', organizationId: 'org-1' },
  })
  mocks.hash.mockResolvedValue('hashed-password')
  mocks.userCreate.mockResolvedValue({
    id: 'user-1',
    email: 'staff@example.com',
    name: 'New Staff',
    role: 'USER',
  })
})

describe('POST /api/users', () => {
  it('rejects attempts to assign TECH_ADMIN or unknown roles', async () => {
    for (const role of ['TECH_ADMIN', 'OWNER']) {
      const response = await POST(new Request('https://example.test/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'staff@example.com',
          name: 'New Staff',
          password: 'long-enough-password',
          role,
        }),
      }))

      expect(response.status).toBe(400)
    }

    expect(mocks.hash).not.toHaveBeenCalled()
    expect(mocks.userCreate).not.toHaveBeenCalled()
  })

  it('allows organization admins to create users with supported roles', async () => {
    const response = await POST(new Request('https://example.test/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'staff@example.com',
        name: 'New Staff',
        password: 'long-enough-password',
        role: 'ADMIN',
      }),
    }))

    expect(response.status).toBe(200)
    expect(mocks.userCreate).toHaveBeenCalledWith({
      data: {
        email: 'staff@example.com',
        name: 'New Staff',
        hashedPassword: 'hashed-password',
        organizationId: 'org-1',
        role: 'ADMIN',
      },
    })
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  organizationFindUnique: vi.fn(),
  userFindMany: vi.fn(),
  userFindUnique: vi.fn(),
  userFindFirst: vi.fn(),
  userCount: vi.fn(),
  userCreate: vi.fn(),
  userUpdateMany: vi.fn(),
  userDeleteMany: vi.fn(),
  queryRaw: vi.fn(),
  tokenDeleteMany: vi.fn(),
  accountDeleteMany: vi.fn(),
  sessionDeleteMany: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: mocks.transaction,
    user: { findMany: mocks.userFindMany },
  },
}))

import {
  createInitialOrganizationAdmin,
  createOrganizationAccount,
  deleteOrganizationAccount,
  listOrganizationAccounts,
  updateOrganizationAccountRole,
} from '@/services/userAccounts.service'

const transactionClient = {
  organization: { findUnique: mocks.organizationFindUnique },
  user: {
    findUnique: mocks.userFindUnique,
    findFirst: mocks.userFindFirst,
    findMany: mocks.userFindMany,
    count: mocks.userCount,
    create: mocks.userCreate,
    updateMany: mocks.userUpdateMany,
    deleteMany: mocks.userDeleteMany,
  },
  $queryRaw: mocks.queryRaw,
  passwordResetToken: { deleteMany: mocks.tokenDeleteMany },
  account: { deleteMany: mocks.accountDeleteMany },
  session: { deleteMany: mocks.sessionDeleteMany },
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.transaction.mockImplementation(async (callback) => callback(transactionClient))
  mocks.organizationFindUnique.mockResolvedValue({ name: 'Salon A' })
  mocks.userFindMany.mockResolvedValue([{
    id: 'user-1',
    email: 'staff@example.com',
    name: 'Staff',
    role: 'USER',
    hashedPassword: null,
  }])
  mocks.userFindUnique.mockResolvedValue(null)
  mocks.userFindFirst.mockResolvedValue({ id: 'admin-1' })
  mocks.userCount.mockResolvedValue(1)
  mocks.userCreate.mockResolvedValue({
    id: 'new-user',
    email: 'new@example.com',
    name: null,
    role: 'ADMIN',
  })
  mocks.userUpdateMany.mockResolvedValue({ count: 1 })
  mocks.userDeleteMany.mockResolvedValue({ count: 1 })
  mocks.queryRaw.mockResolvedValue([{ id: 'org-1', name: 'Salon A' }])
  mocks.tokenDeleteMany.mockResolvedValue({ count: 0 })
  mocks.accountDeleteMany.mockResolvedValue({ count: 0 })
  mocks.sessionDeleteMany.mockResolvedValue({ count: 0 })
})

describe('organization account service', () => {
  it('lists accounts with organization scoping and does not expose password hashes', async () => {
    const accounts = await listOrganizationAccounts('org-1')

    expect(mocks.userFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { organizationId: 'org-1', role: { in: ['USER', 'ADMIN'] } },
    }))
    expect(accounts).toEqual([{
      id: 'user-1',
      name: 'Staff',
      email: 'staff@example.com',
      role: 'USER',
      activationStatus: 'PENDING',
    }])
    expect(JSON.stringify(accounts)).not.toContain('hashedPassword')
  })

  it('creates a passwordless account for the server-selected organization', async () => {
    mocks.userFindFirst.mockResolvedValueOnce({ id: 'admin-1' })
    const result = await createOrganizationAccount({
      actorId: 'admin-1',
      organizationId: 'org-1',
      email: 'new@example.com',
      role: 'ADMIN',
    })

    expect(result.kind).toBe('created')
    expect(mocks.userCreate).toHaveBeenCalledWith({
      data: {
        email: 'new@example.com',
        name: null,
        role: 'ADMIN',
        organizationId: 'org-1',
        hashedPassword: null,
      },
      select: { id: true, email: true, name: true, role: true },
    })
  })

  it('rejects duplicate email addresses before creating an account', async () => {
    mocks.userFindFirst.mockResolvedValueOnce({ id: 'admin-1' })
    mocks.userFindUnique.mockResolvedValueOnce({ id: 'existing-user' })

    await expect(createOrganizationAccount({
      actorId: 'admin-1',
      organizationId: 'org-1',
      email: 'existing@example.com',
      role: 'USER',
    })).resolves.toEqual({ kind: 'email_exists' })
    expect(mocks.userCreate).not.toHaveBeenCalled()
  })

  it('creates the first ADMIN only after locking the explicitly selected organization', async () => {
    mocks.userFindFirst.mockResolvedValueOnce({ id: 'technical-admin' })
    mocks.userCount.mockResolvedValueOnce(0)
    mocks.userCreate.mockResolvedValueOnce({
      id: 'admin-1',
      email: 'admin@example.com',
      name: null,
      role: 'ADMIN',
    })

    const result = await createInitialOrganizationAdmin({
      actorId: 'technical-admin',
      organizationId: 'org-1',
      email: 'admin@example.com',
    })

    expect(mocks.queryRaw).toHaveBeenCalledOnce()
    expect(mocks.userCount).toHaveBeenCalledWith({
      where: { organizationId: 'org-1', role: 'ADMIN' },
    })
    expect(mocks.userCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: {
        email: 'admin@example.com',
        role: 'ADMIN',
        organizationId: 'org-1',
        hashedPassword: null,
      },
    }))
    expect(result).toMatchObject({
      kind: 'created',
      organizationName: 'Salon A',
      account: { email: 'admin@example.com', role: 'ADMIN' },
    })
  })

  it('refuses a second initial ADMIN for that organization', async () => {
    mocks.userFindFirst.mockResolvedValueOnce({ id: 'technical-admin' })
    mocks.userCount.mockResolvedValueOnce(1)

    await expect(createInitialOrganizationAdmin({
      actorId: 'technical-admin',
      organizationId: 'org-1',
      email: 'admin@example.com',
    })).resolves.toEqual({ kind: 'admin_exists' })
    expect(mocks.userCreate).not.toHaveBeenCalled()
  })

  it('scopes role updates to the same organization and retains an admin', async () => {
    mocks.userFindFirst
      .mockResolvedValueOnce({ id: 'admin-1' })
      .mockResolvedValueOnce({ id: 'user-2', role: 'ADMIN', email: 'admin@example.com' })
    mocks.userCount.mockResolvedValueOnce(1)

    await expect(updateOrganizationAccountRole({
      actorId: 'admin-1',
      organizationId: 'org-1',
      accountId: 'user-2',
      role: 'USER',
    })).resolves.toEqual({ kind: 'last_admin' })
    expect(mocks.userFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        id: 'user-2',
        organizationId: 'org-1',
        role: { in: ['USER', 'ADMIN'] },
      },
    }))
    expect(mocks.userUpdateMany).not.toHaveBeenCalled()
  })

  it('deletes only an account in the authorized organization and clears its pending activation token', async () => {
    mocks.userFindFirst
      .mockResolvedValueOnce({ id: 'admin-1' })
      .mockResolvedValueOnce({ id: 'user-2', role: 'USER', email: 'staff@example.com' })
    const result = await deleteOrganizationAccount({
      actorId: 'admin-1',
      organizationId: 'org-1',
      accountId: 'user-2',
    })

    expect(result).toEqual({ kind: 'deleted' })
    expect(mocks.userFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        id: 'user-2',
        organizationId: 'org-1',
        role: { in: ['USER', 'ADMIN'] },
      },
    }))
    expect(mocks.tokenDeleteMany).toHaveBeenCalledWith({
      where: { email: 'staff@example.com' },
    })
    expect(mocks.userDeleteMany).toHaveBeenCalledWith({
      where: { id: 'user-2', organizationId: 'org-1' },
    })
  })

  it('rechecks ADMIN authorization inside the locked account transaction', async () => {
    mocks.userFindFirst.mockResolvedValueOnce(null)

    await expect(updateOrganizationAccountRole({
      actorId: 'demoted-admin',
      organizationId: 'org-1',
      accountId: 'user-2',
      role: 'ADMIN',
    })).resolves.toEqual({ kind: 'actor_forbidden' })
    expect(mocks.userUpdateMany).not.toHaveBeenCalled()
  })
})

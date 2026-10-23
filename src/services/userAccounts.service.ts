import { Prisma } from '@prisma/client'
import {
  assessOrganizationAccountMutation,
  canCreateInitialOrganizationAdmin,
  type OrganizationAccountRole,
} from '@/domain/user-accounts/management'
import { prisma } from '@/lib/prisma'

type AccountSummary = {
  id: string
  email: string
  name: string | null
  role: OrganizationAccountRole
}

export type OrganizationAccountMutationResult =
  | { kind: 'updated' }
  | { kind: 'deleted' }
  | { kind: 'actor_forbidden' }
  | { kind: 'not_found' }
  | { kind: 'self' }
  | { kind: 'privileged_account' }
  | { kind: 'last_admin' }

export type CreateOrganizationAccountResult =
  | { kind: 'created'; account: AccountSummary; organizationName: string }
  | { kind: 'organization_not_found' }
  | { kind: 'actor_forbidden' }
  | { kind: 'email_exists' }

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

export async function listOrganizationAccounts(organizationId: string) {
  const accounts = await prisma.user.findMany({
    where: {
      organizationId,
      role: { in: ['USER', 'ADMIN'] },
    },
    orderBy: [{ role: 'asc' }, { email: 'asc' }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      hashedPassword: true,
    },
  })

  return accounts.map((account) => ({
    id: account.id,
    name: account.name,
    email: account.email,
    role: account.role === 'ADMIN' ? 'ADMIN' as const : 'USER' as const,
    activationStatus: account.hashedPassword ? 'ACTIVE' as const : 'PENDING' as const,
  }))
}

export async function createOrganizationAccount(input: {
  actorId: string
  organizationId: string
  email: string
  name?: string
  role: OrganizationAccountRole
}): Promise<CreateOrganizationAccountResult> {
  try {
    return await prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw(Prisma.sql`
        SELECT "id" FROM "Organization" WHERE "id" = ${input.organizationId} FOR UPDATE
      `)
      const organization = await transaction.organization.findUnique({
        where: { id: input.organizationId },
        select: { name: true },
      })
      if (!organization) return { kind: 'organization_not_found' }

      const actor = await transaction.user.findFirst({
        where: {
          id: input.actorId,
          organizationId: input.organizationId,
          role: 'ADMIN',
        },
        select: { id: true },
      })
      if (!actor) return { kind: 'actor_forbidden' }

      const existing = await transaction.user.findUnique({
        where: { email: input.email },
        select: { id: true },
      })
      if (existing) return { kind: 'email_exists' }

      const account = await transaction.user.create({
        data: {
          email: input.email,
          name: input.name ?? null,
          role: input.role,
          organizationId: input.organizationId,
          hashedPassword: null,
        },
        select: { id: true, email: true, name: true, role: true },
      })
      return {
        kind: 'created',
        organizationName: organization.name,
        account: {
          id: account.id,
          email: account.email ?? input.email,
          name: account.name,
          role: account.role === 'ADMIN' ? 'ADMIN' as const : 'USER' as const,
        },
      }
    })
  } catch (error: unknown) {
    if (isUniqueConstraintError(error)) return { kind: 'email_exists' }
    throw error
  }
}

export async function createInitialOrganizationAdmin(input: {
  actorId: string
  organizationId: string
  email: string
}): Promise<CreateOrganizationAccountResult | { kind: 'admin_exists' }> {
  try {
    return await prisma.$transaction(async (transaction) => {
      const organizations = await transaction.$queryRaw<Array<{ id: string; name: string }>>(Prisma.sql`
        SELECT "id", "name"
        FROM "Organization"
        WHERE "id" = ${input.organizationId}
        FOR UPDATE
      `)
      const organization = organizations[0]
      if (!organization) return { kind: 'organization_not_found' }

      const actor = await transaction.user.findFirst({
        where: { id: input.actorId, role: 'TECH_ADMIN' },
        select: { id: true },
      })
      if (!actor) return { kind: 'actor_forbidden' }

      const existingAdminCount = await transaction.user.count({
        where: { organizationId: input.organizationId, role: 'ADMIN' },
      })
      if (!canCreateInitialOrganizationAdmin(existingAdminCount)) {
        return { kind: 'admin_exists' }
      }

      const existing = await transaction.user.findUnique({
        where: { email: input.email },
        select: { id: true },
      })
      if (existing) return { kind: 'email_exists' }

      const account = await transaction.user.create({
        data: {
          email: input.email,
          role: 'ADMIN',
          organizationId: input.organizationId,
          hashedPassword: null,
        },
        select: { id: true, email: true, name: true, role: true },
      })
      return {
        kind: 'created',
        organizationName: organization.name,
        account: {
          id: account.id,
          email: account.email ?? input.email,
          name: account.name,
          role: 'ADMIN',
        },
      }
    })
  } catch (error: unknown) {
    if (isUniqueConstraintError(error)) return { kind: 'email_exists' }
    throw error
  }
}

export async function updateOrganizationAccountRole(input: {
  actorId: string
  organizationId: string
  accountId: string
  role: OrganizationAccountRole
}): Promise<OrganizationAccountMutationResult> {
  return prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw(Prisma.sql`
      SELECT "id" FROM "Organization" WHERE "id" = ${input.organizationId} FOR UPDATE
    `)
    const actor = await transaction.user.findFirst({
      where: {
        id: input.actorId,
        organizationId: input.organizationId,
        role: 'ADMIN',
      },
      select: { id: true },
    })
    if (!actor) return { kind: 'actor_forbidden' }

    const account = await transaction.user.findFirst({
      where: {
        id: input.accountId,
        organizationId: input.organizationId,
        role: { in: ['USER', 'ADMIN'] },
      },
      select: { id: true, role: true },
    })
    if (!account) return { kind: 'not_found' }

    const adminCount = await transaction.user.count({
      where: { organizationId: input.organizationId, role: 'ADMIN' },
    })
    const decision = assessOrganizationAccountMutation({
      actorId: input.actorId,
      targetId: account.id,
      targetRole: account.role,
      organizationAdminCount: adminCount,
      nextRole: input.role,
    })
    if (decision !== 'allowed') return { kind: decision }

    const result = await transaction.user.updateMany({
      where: { id: input.accountId, organizationId: input.organizationId },
      data: { role: input.role },
    })
    return result.count === 1 ? { kind: 'updated' } : { kind: 'not_found' }
  })
}

export async function deleteOrganizationAccount(input: {
  actorId: string
  organizationId: string
  accountId: string
}): Promise<OrganizationAccountMutationResult> {
  return prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw(Prisma.sql`
      SELECT "id" FROM "Organization" WHERE "id" = ${input.organizationId} FOR UPDATE
    `)
    const actor = await transaction.user.findFirst({
      where: {
        id: input.actorId,
        organizationId: input.organizationId,
        role: 'ADMIN',
      },
      select: { id: true },
    })
    if (!actor) return { kind: 'actor_forbidden' }

    const account = await transaction.user.findFirst({
      where: {
        id: input.accountId,
        organizationId: input.organizationId,
        role: { in: ['USER', 'ADMIN'] },
      },
      select: { id: true, role: true, email: true },
    })
    if (!account) return { kind: 'not_found' }

    const adminCount = await transaction.user.count({
      where: { organizationId: input.organizationId, role: 'ADMIN' },
    })
    const decision = assessOrganizationAccountMutation({
      actorId: input.actorId,
      targetId: account.id,
      targetRole: account.role,
      organizationAdminCount: adminCount,
    })
    if (decision !== 'allowed') return { kind: decision }

    if (account.email) {
      await transaction.passwordResetToken.deleteMany({ where: { email: account.email } })
    }
    await transaction.account.deleteMany({ where: { userId: account.id } })
    await transaction.session.deleteMany({ where: { userId: account.id } })
    const result = await transaction.user.deleteMany({
      where: { id: input.accountId, organizationId: input.organizationId },
    })
    return result.count === 1 ? { kind: 'deleted' } : { kind: 'not_found' }
  })
}

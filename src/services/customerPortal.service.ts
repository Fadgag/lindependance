import { Prisma, type Prisma as PrismaTypes } from '@prisma/client'
import {
  logoSizeSchema,
  portalAppearanceSchema,
} from '@/domain/branding/logoSettings'
import { shouldInvalidateCustomerOtp } from '@/domain/customer-portal/identity'
import { isRateLimitExceeded } from '@/domain/customer-portal/rateLimit'
import {
  getCustomerPortalSecret,
  verifyCustomerPortalSession,
  verifyOtpHash,
  type CustomerPortalSession,
} from '@/lib/customerPortalSecurity'
import { prisma } from '@/lib/prisma'

export const CUSTOMER_PORTAL_SESSION_COOKIE = 'customer_portal_session'

export class CustomerPortalHttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'CustomerPortalHttpError'
  }
}

export class SerializableConflictError extends Error {
  constructor() {
    super('Concurrent scheduling change prevented the transaction from completing')
    this.name = 'SerializableConflictError'
  }
}

export interface PortalOrganization {
  id: string
  name: string
  timezone: string
  openingTime: string
  closingTime: string
  portalOtpEmailTemplate?: string | null
}

export async function findEnabledPortalOrganization(slug: string): Promise<PortalOrganization | null> {
  return prisma.organization.findFirst({
    where: { slug, portalEnabled: true, staff: { some: { active: true } } },
    select: {
      id: true,
      name: true,
      timezone: true,
      openingTime: true,
      closingTime: true,
      portalOtpEmailTemplate: true,
    },
  })
}

export async function findEnabledPortalBookingOrganization(slug: string) {
  const organization = await prisma.organization.findFirst({
    where: { slug, portalEnabled: true, staff: { some: { active: true } } },
    select: {
      name: true,
      timezone: true,
      portalContactPhone: true,
      portalContactEmail: true,
      logoDataUrl: true,
      logoShape: true,
      logoSize: true,
      portalNameFont: true,
      portalNameSize: true,
      portalNameColor: true,
      portalNameWeight: true,
      portalNameAlignment: true,
      portalLogoSize: true,
    },
  })
  if (!organization) return null

  return {
    ...organization,
    ...portalAppearanceSchema.parse(organization),
    logoSize: logoSizeSchema.parse(organization.logoSize),
  }
}

export async function findEnabledPortalAppointmentOrganization(slug: string) {
  const organization = await prisma.organization.findFirst({
    where: { slug, portalEnabled: true, staff: { some: { active: true } } },
    select: {
      name: true,
      timezone: true,
      logoDataUrl: true,
      logoShape: true,
      portalNameFont: true,
      portalNameSize: true,
      portalNameColor: true,
      portalNameWeight: true,
      portalNameAlignment: true,
      portalLogoSize: true,
    },
  })
  if (!organization) return null

  return {
    name: organization.name,
    timezone: organization.timezone,
    ...portalAppearanceSchema.parse(organization),
  }
}

export async function findDefaultEnabledPortalOrganization(): Promise<{ slug: string } | null> {
  const organizations = await prisma.organization.findMany({
    where: {
      portalEnabled: true,
      slug: { not: null },
      staff: { some: { active: true } },
    },
    select: { slug: true },
    take: 2,
  })
  if (organizations.length !== 1 || !organizations[0].slug) return null
  return { slug: organizations[0].slug }
}

export async function findEnabledPortalOrganizationForSession(
  session: CustomerPortalSession,
): Promise<PortalOrganization | null> {
  return prisma.organization.findFirst({
    where: {
      id: session.organizationId,
      portalEnabled: true,
      staff: { some: { active: true } },
    },
    select: {
      id: true,
      name: true,
      timezone: true,
      openingTime: true,
      closingTime: true,
    },
  })
}

function getCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null
  for (const cookie of cookieHeader.split(';')) {
    const separator = cookie.indexOf('=')
    if (separator < 0 || cookie.slice(0, separator).trim() !== name) continue
    try {
      return decodeURIComponent(cookie.slice(separator + 1).trim())
    } catch {
      return null
    }
  }
  return null
}

export async function getCustomerPortalSession(request: Request): Promise<CustomerPortalSession | null> {
  const session = verifyCustomerPortalSession(
    getCookieValue(request.headers.get('cookie'), CUSTOMER_PORTAL_SESSION_COOKIE),
    getCustomerPortalSecret(),
  )
  if (!session) return null
  const organization = await findEnabledPortalOrganizationForSession(session)
  return organization ? session : null
}

export function setCustomerPortalSessionCookie(response: Response, token: string): Response {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  response.headers.append(
    'Set-Cookie',
    `${CUSTOMER_PORTAL_SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${secure}`,
  )
  return response
}

export function clearCustomerPortalSessionCookie(response: Response): Response {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  response.headers.append(
    'Set-Cookie',
    `${CUSTOMER_PORTAL_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`,
  )
  return response
}

export function getRequestIp(request: Request): string {
  const realIp = request.headers.get('x-real-ip')?.trim()
  if (realIp && realIp.length <= 128) return realIp

  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwardedFor && forwardedFor.length <= 128 ? forwardedFor : 'unknown'
}

function isSerializationFailure(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { code?: unknown; message?: unknown }
  return candidate.code === 'P2034'
    || candidate.code === '40001'
    || (typeof candidate.message === 'string' && candidate.message.includes('40001'))
}

export async function withSerializableRetry<T>(
  operation: (transaction: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      })
    } catch (error: unknown) {
      if (!isSerializationFailure(error)) throw error
      if (attempt === 2) throw new SerializableConflictError()
    }
  }
  throw new SerializableConflictError()
}

export interface RateLimitCheck {
  scope: string
  keyHash: string
  limit: number
  windowMilliseconds: number
}

export async function recordPortalRateLimits(
  transaction: PrismaTypes.TransactionClient,
  checks: RateLimitCheck[],
  now: Date,
): Promise<boolean> {
  const scopes = new Map<string, number>()
  for (const check of checks) {
    scopes.set(check.scope, Math.max(scopes.get(check.scope) ?? 0, check.windowMilliseconds))
  }
  for (const [scope, retentionWindow] of scopes) {
    await transaction.customerPortalRateLimitEvent.deleteMany({
      where: {
        scope,
        createdAt: { lt: new Date(now.getTime() - retentionWindow) },
      },
    })
  }

  for (const check of checks) {
    const events = await transaction.customerPortalRateLimitEvent.findMany({
      where: {
        scope: check.scope,
        keyHash: check.keyHash,
        createdAt: { gte: new Date(now.getTime() - check.windowMilliseconds) },
      },
      select: { createdAt: true },
    })
    if (isRateLimitExceeded(events.map((event) => event.createdAt), now, check.windowMilliseconds, check.limit)) {
      return false
    }
  }

  if (checks.length > 0) {
    await transaction.customerPortalRateLimitEvent.createMany({
      data: checks.map(({ scope, keyHash }) => ({ scope, keyHash, createdAt: now })),
    })
  }
  return true
}

export async function consumePortalRateLimits(
  checks: RateLimitCheck[],
  now = new Date(),
): Promise<boolean> {
  return withSerializableRetry(async (transaction: PrismaTypes.TransactionClient) => {
    return recordPortalRateLimits(transaction, checks, now)
  })
}

export async function issueCustomerOtp(input: {
  organizationId: string
  email: string
  codeHash: string
  expiresAt: Date
  now: Date
}): Promise<void> {
  await withSerializableRetry(async (transaction: PrismaTypes.TransactionClient) => {
    await transaction.customerEmailOtp.updateMany({
      where: {
        organizationId: input.organizationId,
        email: input.email,
        consumedAt: null,
      },
      data: { consumedAt: input.now },
    })
    await transaction.customerEmailOtp.create({
      data: {
        organizationId: input.organizationId,
        email: input.email,
        codeHash: input.codeHash,
        expiresAt: input.expiresAt,
        createdAt: input.now,
      },
    })
    await transaction.customerEmailOtp.deleteMany({
      where: { expiresAt: { lt: input.now } },
    })
  })
}

export async function consumeCustomerOtp(input: {
  organizationId: string
  email: string
  code: string
  secret: string
  now: Date
}): Promise<boolean> {
  return withSerializableRetry(async (transaction: PrismaTypes.TransactionClient) => {
    const challenge = await transaction.customerEmailOtp.findFirst({
      where: {
        organizationId: input.organizationId,
        email: input.email,
        consumedAt: null,
        expiresAt: { gt: input.now },
        attempts: { lt: 5 },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, codeHash: true },
    })
    if (!challenge) return false

    const where = {
      id: challenge.id,
      consumedAt: null,
      expiresAt: { gt: input.now },
      attempts: { lt: 5 },
    }
    if (!verifyOtpHash(input.code, challenge.codeHash, input.secret)) {
      await transaction.customerEmailOtp.updateMany({
        where,
        data: { attempts: { increment: 1 } },
      })
      return false
    }

    const customerCount = await transaction.customer.count({
      where: { organizationId: input.organizationId, email: input.email },
    })
    if (customerCount === 0) {
      await transaction.customerEmailOtp.updateMany({
        where,
        data: { consumedAt: input.now },
      })
      return false
    }

    const consumed = await transaction.customerEmailOtp.updateMany({
      where: { ...where, codeHash: challenge.codeHash },
      data: { consumedAt: input.now },
    })
    return consumed.count === 1
  })
}

export async function updateCustomerForStaff(input: {
  organizationId: string
  customerId: string
  data: PrismaTypes.CustomerUncheckedUpdateInput
}): Promise<number> {
  return withSerializableRetry(async (transaction) => {
    const customer = await transaction.customer.findFirst({
      where: { id: input.customerId, organizationId: input.organizationId },
      select: { email: true },
    })
    if (!customer) return 0

    const nextEmail = typeof input.data.email === 'string' || input.data.email === null
      ? input.data.email
      : undefined
    if (shouldInvalidateCustomerOtp(customer.email, nextEmail)) {
      const previousEmail = customer.email?.trim().toLowerCase()
      if (previousEmail) {
        await transaction.customerEmailOtp.updateMany({
          where: {
            organizationId: input.organizationId,
            email: previousEmail,
            consumedAt: null,
          },
          data: { consumedAt: new Date() },
        })
      }
    }

    const updated = await transaction.customer.updateMany({
      where: { id: input.customerId, organizationId: input.organizationId },
      data: input.data,
    })
    return updated.count
  })
}

export function isCustomerPortalHttpError(error: unknown): error is CustomerPortalHttpError {
  return error instanceof CustomerPortalHttpError
}

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaMock, portalServiceMock, sendOtpMock } = vi.hoisted(() => ({
  prismaMock: {
    customer: { findFirst: vi.fn() },
  },
  portalServiceMock: {
    findEnabledPortalOrganization: vi.fn(),
    consumePortalRateLimits: vi.fn(),
    getRequestIp: vi.fn(),
    issueCustomerOtp: vi.fn(),
  },
  sendOtpMock: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/services/customerPortal.service', () => portalServiceMock)
vi.mock('@/services/customerPortalEmail.service', () => ({
  sendCustomerPortalOtpEmail: sendOtpMock,
}))

import { POST } from '@/app/api/portail/auth/request-code/route'
import { prisma } from '@/lib/prisma'
import {
  consumePortalRateLimits,
  findEnabledPortalOrganization,
  issueCustomerOtp,
} from '@/services/customerPortal.service'
import { sendCustomerPortalOtpEmail } from '@/services/customerPortalEmail.service'

const organization = {
  id: 'internal-organization-id',
  name: 'Atelier',
  timezone: 'Europe/Paris',
  openingTime: '09:00',
  closingTime: '18:00',
  portalOtpEmailTemplate: 'Code : {{code}}',
}

function requestCode() {
  return new Request('https://example.test/api/portail/auth/request-code', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-real-ip': '203.0.113.10',
    },
    body: JSON.stringify({
      organizationSlug: 'atelier',
      email: 'Client@Example.com',
    }),
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(findEnabledPortalOrganization).mockResolvedValue(organization)
  vi.mocked(consumePortalRateLimits).mockResolvedValue(true)
  vi.mocked(portalServiceMock.getRequestIp).mockReturnValue('203.0.113.10')
  vi.mocked(prisma.customer.findFirst).mockResolvedValue(null)
  vi.mocked(issueCustomerOtp).mockResolvedValue(undefined)
  vi.mocked(sendCustomerPortalOtpEmail).mockResolvedValue(undefined)
  process.env.NEXTAUTH_SECRET = 'test-customer-portal-secret'
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('POST /api/portail/auth/request-code', () => {
  it('returns the same response whether or not an email belongs to a customer', async () => {
    const unknownAddressResponse = await POST(requestCode())
    vi.mocked(prisma.customer.findFirst).mockResolvedValueOnce({ id: 'customer-1' } as never)
    const knownAddressResponse = await POST(requestCode())

    expect(unknownAddressResponse.status).toBe(202)
    expect(knownAddressResponse.status).toBe(202)
    expect(await unknownAddressResponse.json()).toEqual({ ok: true })
    expect(await knownAddressResponse.json()).toEqual({ ok: true })
    expect(issueCustomerOtp).toHaveBeenCalledOnce()
    expect(sendCustomerPortalOtpEmail).toHaveBeenCalledOnce()
    expect(sendCustomerPortalOtpEmail).toHaveBeenCalledWith(expect.objectContaining({
      template: 'Code : {{code}}',
    }))
  })

  it.each([
    { vercelEnvironment: 'preview', gitCommitRef: 'preprod', emailLimit: 10, ipLimit: 30 },
    { vercelEnvironment: 'production', gitCommitRef: 'preprod', emailLimit: 3, ipLimit: 10 },
    { vercelEnvironment: 'preview', gitCommitRef: 'feature/other', emailLimit: 3, ipLimit: 10 },
  ])(
    'uses the expected OTP limits for $vercelEnvironment on $gitCommitRef',
    async ({ vercelEnvironment, gitCommitRef, emailLimit, ipLimit }) => {
      vi.stubEnv('VERCEL_ENV', vercelEnvironment)
      vi.stubEnv('VERCEL_GIT_COMMIT_REF', gitCommitRef)

      await POST(requestCode())

      expect(consumePortalRateLimits).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            scope: 'otp-email-request',
            limit: emailLimit,
            windowMilliseconds: 15 * 60 * 1000,
          }),
          expect.objectContaining({
            scope: 'otp-ip-request',
            limit: ipLimit,
            windowMilliseconds: 60 * 60 * 1000,
          }),
        ]),
        expect.any(Date),
      )
    },
  )

  it('does not accept an organization id from the browser', async () => {
    const response = await POST(new Request('https://example.test/api/portail/auth/request-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationSlug: 'atelier',
        organizationId: 'forged-id',
        email: 'client@example.com',
      }),
    }))

    expect(response.status).toBe(400)
    expect(consumePortalRateLimits).not.toHaveBeenCalled()
  })
})

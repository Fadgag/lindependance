import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { portalServiceMock } = vi.hoisted(() => ({
  portalServiceMock: {
    findEnabledPortalOrganization: vi.fn(),
    consumePortalRateLimits: vi.fn(),
    getRequestIp: vi.fn(),
    consumeCustomerOtp: vi.fn(),
  },
}))

vi.mock('@/services/customerPortal.service', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/services/customerPortal.service')>(),
  ...portalServiceMock,
}))

import { POST } from '@/app/api/portail/auth/verify-code/route'
import {
  consumeCustomerOtp,
  consumePortalRateLimits,
  findEnabledPortalOrganization,
} from '@/services/customerPortal.service'

function verifyCode() {
  return new Request('https://example.test/api/portail/auth/verify-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-real-ip': '203.0.113.10' },
    body: JSON.stringify({
      organizationSlug: 'atelier',
      email: 'Client@Example.com',
      code: '012345',
    }),
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(findEnabledPortalOrganization).mockResolvedValue({
    id: 'internal-organization-id',
    name: 'Atelier',
    timezone: 'Europe/Paris',
    openingTime: '09:00',
    closingTime: '18:00',
  })
  vi.mocked(consumePortalRateLimits).mockResolvedValue(true)
  vi.mocked(portalServiceMock.getRequestIp).mockReturnValue('203.0.113.10')
  vi.mocked(consumeCustomerOtp).mockResolvedValue(true)
  process.env.NEXTAUTH_SECRET = 'test-customer-portal-secret'
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('POST /api/portail/auth/verify-code', () => {
  it('issues a signed CUSTOMER-only cookie after an OTP is atomically consumed', async () => {
    const response = await POST(verifyCode())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    expect(response.headers.get('set-cookie')).toContain('customer_portal_session=')
    expect(response.headers.get('set-cookie')).toContain('HttpOnly')
    expect(consumeCustomerOtp).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: 'internal-organization-id',
      email: 'client@example.com',
      code: '012345',
    }))
  })

  it('does not issue a cookie for an expired, consumed, unknown, or incorrect OTP', async () => {
    vi.mocked(consumeCustomerOtp).mockResolvedValueOnce(false)

    const response = await POST(verifyCode())

    expect(response.status).toBe(400)
    expect(response.headers.get('set-cookie')).toBeNull()
  })

  it('does not create a shared IP bucket when no trusted proxy IP is available', async () => {
    vi.mocked(portalServiceMock.getRequestIp).mockReturnValue(null)

    const response = await POST(verifyCode())

    expect(response.status).toBe(200)
    expect(consumePortalRateLimits).not.toHaveBeenCalled()
    expect(consumeCustomerOtp).toHaveBeenCalledOnce()
  })

  it.each([
    { vercelEnvironment: 'preview', gitCommitRef: 'preprod', ipLimit: 30 },
    { vercelEnvironment: 'production', gitCommitRef: 'preprod', ipLimit: 10 },
    { vercelEnvironment: 'preview', gitCommitRef: 'feature/other', ipLimit: 10 },
  ])(
    'uses the expected IP limit for $vercelEnvironment on $gitCommitRef',
    async ({ vercelEnvironment, gitCommitRef, ipLimit }) => {
      vi.stubEnv('VERCEL_ENV', vercelEnvironment)
      vi.stubEnv('VERCEL_GIT_COMMIT_REF', gitCommitRef)

      await POST(verifyCode())

      expect(consumePortalRateLimits).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            scope: 'otp-ip-request',
            limit: ipLimit,
            windowMilliseconds: 60 * 60 * 1000,
          }),
        ],
        expect.any(Date),
      )
    },
  )
})

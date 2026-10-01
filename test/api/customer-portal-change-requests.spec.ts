import { beforeEach, describe, expect, it, vi } from 'vitest'

const { portalServiceMock, changeRequestServiceMock } = vi.hoisted(() => ({
  portalServiceMock: { getCustomerPortalSession: vi.fn(), isCustomerPortalHttpError: vi.fn() },
  changeRequestServiceMock: { createCustomerPortalChangeRequest: vi.fn() },
}))

vi.mock('@/services/customerPortal.service', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/services/customerPortal.service')>(),
  ...portalServiceMock,
}))
vi.mock('@/services/appointmentChangeRequests.service', () => changeRequestServiceMock)

import { POST } from '@/app/api/portail/rdv/[id]/demande-modification/route'
import { getCustomerPortalSession } from '@/services/customerPortal.service'
import { createCustomerPortalChangeRequest } from '@/services/appointmentChangeRequests.service'

const session = {
  accountType: 'CUSTOMER' as const,
  organizationId: 'org-1',
  verifiedEmail: 'parent@example.com',
  expiresAt: Date.now() + 60_000,
}
const context = { params: Promise.resolve({ id: 'appointment-1' }) }

function request(body: Record<string, unknown>) {
  return new Request('https://example.test/api/portail/rdv/appointment-1/demande-modification', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: 'customer_portal_session=signed',
    },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(getCustomerPortalSession).mockReturnValue(session)
  vi.mocked(createCustomerPortalChangeRequest).mockResolvedValue({ id: 'request-1', status: 'PENDING' })
})

describe('POST /api/portail/rdv/[id]/demande-modification', () => {
  it('creates a pending request from session identity and requested start only', async () => {
    const requestedStart = '2026-10-04T08:30:00.000Z'
    const response = await POST(request({
      requestedStart,
      reason: 'Un imprévu',
    }), context)

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ id: 'request-1', status: 'PENDING' })
    expect(createCustomerPortalChangeRequest).toHaveBeenCalledWith({
      appointmentId: 'appointment-1',
      organizationId: 'org-1',
      verifiedEmail: 'parent@example.com',
      requestedStart,
      reason: 'Un imprévu',
    })
  })

  it('rejects forged customer, organization, service, or end-time fields', async () => {
    const response = await POST(request({
      requestedStart: '2026-10-04T08:30:00.000Z',
      customerId: 'another-customer',
      end: '2026-10-04T09:30:00.000Z',
    }), context)

    expect(response.status).toBe(400)
    expect(createCustomerPortalChangeRequest).not.toHaveBeenCalled()
  })

  it('requires a customer portal session and rejects cross-origin mutation', async () => {
    vi.mocked(getCustomerPortalSession).mockReturnValueOnce(null)
    const unauthenticated = await POST(request({
      requestedStart: '2026-10-04T08:30:00.000Z',
    }), context)
    expect(unauthenticated.status).toBe(401)

    const crossOrigin = new Request(
      'https://example.test/api/portail/rdv/appointment-1/demande-modification',
      {
        method: 'POST',
        headers: { origin: 'https://attacker.example', 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestedStart: '2026-10-04T08:30:00.000Z' }),
      },
    )
    const denied = await POST(crossOrigin, context)
    expect(denied.status).toBe(403)
    expect(createCustomerPortalChangeRequest).not.toHaveBeenCalled()
  })
})

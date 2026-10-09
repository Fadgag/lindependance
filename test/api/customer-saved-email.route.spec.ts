import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaMock, authMock, sendSavedEmailMock } = vi.hoisted(() => ({
  prismaMock: {
    customer: { findFirst: vi.fn() },
  },
  authMock: vi.fn(),
  sendSavedEmailMock: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/auth', () => ({ auth: authMock }))
vi.mock('@/services/customerPortalEmail.service', () => ({
  sendCustomerPortalSavedEmail: sendSavedEmailMock,
}))

import { POST } from '@/app/api/customers/[id]/send-portal-email/route'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { sendCustomerPortalSavedEmail } from '@/services/customerPortalEmail.service'

const routeContext = { params: Promise.resolve({ id: 'customer-1' }) }

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(auth).mockResolvedValue({ user: { organizationId: 'org-1' } } as never)
  vi.mocked(prisma.customer.findFirst).mockResolvedValue({
    email: 'client@example.com',
    organization: { name: 'Atelier', slug: 'atelier', portalEnabled: true },
  } as never)
  vi.mocked(sendCustomerPortalSavedEmail).mockResolvedValue(undefined)
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.example.test/')
})

describe('POST /api/customers/[id]/send-portal-email', () => {
  it('requires an authenticated organization member', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never)

    const response = await POST(
      new Request('https://app.example.test/api/customers/customer-1/send-portal-email', { method: 'POST' }),
      routeContext,
    )

    expect(response.status).toBe(401)
    expect(prisma.customer.findFirst).not.toHaveBeenCalled()
    expect(sendCustomerPortalSavedEmail).not.toHaveBeenCalled()
  })

  it('sends the saved address and a link to the owning organization portal', async () => {
    const response = await POST(
      new Request('https://app.example.test/api/customers/customer-1/send-portal-email', { method: 'POST' }),
      routeContext,
    )

    expect(response.status).toBe(200)
    expect(prisma.customer.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'customer-1', organizationId: 'org-1' },
    }))
    expect(sendCustomerPortalSavedEmail).toHaveBeenCalledWith({
      to: 'client@example.com',
      organizationName: 'Atelier',
      portalUrl: 'https://app.example.test/portail/atelier/reserver',
    })
  })

  it('does not send if the customer belongs to another organization', async () => {
    vi.mocked(prisma.customer.findFirst).mockResolvedValue(null)

    const response = await POST(
      new Request('https://app.example.test/api/customers/customer-1/send-portal-email', { method: 'POST' }),
      routeContext,
    )

    expect(response.status).toBe(404)
    expect(sendCustomerPortalSavedEmail).not.toHaveBeenCalled()
  })

  it('requires an email address on the customer fiche', async () => {
    vi.mocked(prisma.customer.findFirst).mockResolvedValue({
      email: null,
      organization: { name: 'Atelier', slug: 'atelier', portalEnabled: true },
    } as never)

    const response = await POST(
      new Request('https://app.example.test/api/customers/customer-1/send-portal-email', { method: 'POST' }),
      routeContext,
    )

    expect(response.status).toBe(409)
    expect(sendCustomerPortalSavedEmail).not.toHaveBeenCalled()
  })

  it('requires an active portal with a configured slug', async () => {
    vi.mocked(prisma.customer.findFirst).mockResolvedValue({
      email: 'client@example.com',
      organization: { name: 'Atelier', slug: null, portalEnabled: false },
    } as never)

    const response = await POST(
      new Request('https://app.example.test/api/customers/customer-1/send-portal-email', { method: 'POST' }),
      routeContext,
    )

    expect(response.status).toBe(409)
    expect(sendCustomerPortalSavedEmail).not.toHaveBeenCalled()
  })

  it('returns an explicit failure if the email provider rejects the message', async () => {
    vi.mocked(sendCustomerPortalSavedEmail).mockRejectedValueOnce(new Error('provider rejected message'))

    const response = await POST(
      new Request('https://app.example.test/api/customers/customer-1/send-portal-email', { method: 'POST' }),
      routeContext,
    )

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'Impossible d’envoyer l’e-mail au client.' })
  })
})

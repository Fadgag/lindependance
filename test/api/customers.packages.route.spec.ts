import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mocks -----------------------------------------------------------------

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    customer: { findFirst: vi.fn() },
    customerPackage: { findMany: vi.fn() },
  },
}))

vi.mock('../../src/auth', () => ({ auth: vi.fn() }))

// --- Imports (after mocks) ---------------------------------------------------

import { GET } from '../../src/app/api/customers/[id]/packages/route'
import { prisma } from '../../src/lib/prisma'
import { auth } from '../../src/auth'

const CUID_ORG  = 'ctest_org_aaa0000000001'
const CUID_CUST = 'ctest_cus_bbb0000000001'

function mockSession(orgId = CUID_ORG) {
  ;(auth as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ user: { organizationId: orgId } })
}

function makeRequest() {
  return new Request(`http://localhost/api/customers/${CUID_CUST}/packages`)
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('GET /api/customers/[id]/packages', () => {
  it('filtre les forfaits sans séance restante (règle canConsumeSession)', async () => {
    mockSession()
    ;(prisma.customer.findFirst as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ id: CUID_CUST, organizationId: CUID_ORG })
    ;(prisma.customerPackage.findMany as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([
        { id: 'cp_usable', totalSessions: 5, sessionsRemaining: 3, expiresAt: null, package: null },
        { id: 'cp_exhausted', totalSessions: 5, sessionsRemaining: 0, expiresAt: null, package: null },
      ])

    const res = await GET(makeRequest())
    const body = await (res as Response).json()

    expect(res.status).toBe(200)
    expect(body).toHaveLength(1)
    expect(body[0].id).toBe('cp_usable')
  })

  it('retourne une liste vide si aucun forfait n’est utilisable', async () => {
    mockSession()
    ;(prisma.customer.findFirst as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ id: CUID_CUST, organizationId: CUID_ORG })
    ;(prisma.customerPackage.findMany as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([
        { id: 'cp_exhausted', totalSessions: 5, sessionsRemaining: 0, expiresAt: null, package: null },
      ])

    const res = await GET(makeRequest())
    const body = await (res as Response).json()

    expect(res.status).toBe(200)
    expect(body).toEqual([])
  })

  it('retourne 404 si le client n’appartient pas à l’organisation (Anti-IDOR)', async () => {
    mockSession()
    ;(prisma.customer.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null)

    const res = await GET(makeRequest())

    expect(res.status).toBe(404)
    expect(prisma.customerPackage.findMany).not.toHaveBeenCalled()
  })

  it('retourne 401 si non authentifié', async () => {
    ;(auth as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null)

    const res = await GET(makeRequest())

    expect(res.status).toBe(401)
    expect(prisma.customerPackage.findMany).not.toHaveBeenCalled()
  })
})

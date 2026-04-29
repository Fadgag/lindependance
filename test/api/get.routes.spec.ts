import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mocks -----------------------------------------------------------------

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    appointment: {
      findMany: vi.fn(),
    },
    unavailability: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('../../src/auth', () => ({ auth: vi.fn() }))

// --- Imports (after mocks) -------------------------------------------------

import { GET as getAppointments } from '../../src/app/api/appointments/route'
import { GET as getUnavailability } from '../../src/app/api/unavailability/route'
import { prisma } from '../../src/lib/prisma'
import { auth } from '../../src/auth'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CUID_ORG = 'ctest_org_aaa0000000001'

function mockSession(orgId = CUID_ORG) {
  ;(auth as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ user: { organizationId: orgId } })
}

function makeGetRequest(path: string, params?: Record<string, string>) {
  const url = new URL(`http://localhost${path}`)
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new Request(url.toString(), { method: 'GET' })
}

beforeEach(() => {
  vi.resetAllMocks()
})

// ===========================================================================
//  GET /api/appointments
// ===========================================================================

describe('GET /api/appointments', () => {
  it('retourne 401 si non authentifié', async () => {
    ;(auth as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null)

    const res = await getAppointments(makeGetRequest('/api/appointments'))

    expect(res.status).toBe(401)
    expect(prisma.appointment.findMany).not.toHaveBeenCalled()
  })

  it('filtre par organizationId de la session — org scoping vérifié dans findMany', async () => {
    mockSession()
    ;(prisma.appointment.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([])

    const res = await getAppointments(makeGetRequest('/api/appointments'))

    expect(res.status).toBe(200)
    const findCall = (prisma.appointment.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(findCall.where.organizationId).toBe(CUID_ORG)
  })
})

// ===========================================================================
//  GET /api/unavailability
// ===========================================================================

describe('GET /api/unavailability', () => {
  it('retourne 401 si non authentifié', async () => {
    ;(auth as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null)

    const res = await getUnavailability(makeGetRequest('/api/unavailability'))

    expect(res.status).toBe(401)
    expect(prisma.unavailability.findMany).not.toHaveBeenCalled()
  })

  it('filtre par organizationId de la session — org scoping vérifié dans findMany', async () => {
    mockSession()
    ;(prisma.unavailability.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([])

    const res = await getUnavailability(makeGetRequest('/api/unavailability'))

    expect(res.status).toBe(200)
    const findCall = (prisma.unavailability.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(findCall.where.organizationId).toBe(CUID_ORG)
  })
})


import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mocks -----------------------------------------------------------------

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    appointment: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    service: { findFirst: vi.fn() },
    customerPackage: { updateMany: vi.fn() },
  },
}))

vi.mock('../../src/auth', () => ({ auth: vi.fn() }))

// --- Imports (after mocks) -------------------------------------------------

import { POST, DELETE } from '../../src/app/api/appointments/route'
import { prisma } from '../../src/lib/prisma'
import { auth } from '../../src/auth'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Zod cuid() accepts strings matching /^c[^\s-]{8,}$/i
const CUID_ORG   = 'ctest_org_aaa0000000001'
const CUID_APT   = 'ctest_apt_bbb0000000001'
const CUID_SVC   = 'ctest_svc_ccc0000000001'
const CUID_CUST  = 'ctest_cus_ddd0000000001'
const CUID_STAFF = 'ctest_stf_eee0000000001'
const CUID_ORG_B = 'ctest_org_fff0000000002'

const NOW   = new Date('2026-05-01T10:00:00.000Z')
const LATER = new Date('2026-05-01T11:00:00.000Z')

function mockSession(orgId = CUID_ORG) {
  ;(auth as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ user: { organizationId: orgId } })
}

function makePostRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/appointments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeDeleteRequest(id: string) {
  return new Request(`http://localhost/api/appointments?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

const VALID_POST_BODY = {
  start:     NOW.toISOString(),
  end:       LATER.toISOString(),
  duration:  60,
  serviceId: CUID_SVC,
  customerId: CUID_CUST,
  staffId:   CUID_STAFF,
}

// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.resetAllMocks()
})

// ===========================================================================
//  POST /api/appointments
// ===========================================================================

describe('POST /api/appointments', () => {
  it('crée un RDV et retourne l\'objet créé — organizationId injecté depuis la session (jamais du body)', async () => {
    mockSession()
    ;(prisma.service.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ price: 50 })
    const createdRow = {
      id: CUID_APT,
      startTime: NOW, endTime: LATER, status: 'CONFIRMED',
      finalPrice: null, price: 50, serviceId: CUID_SVC,
      customerId: CUID_CUST, staffId: CUID_STAFF, note: null, duration: 60,
    }
    ;(prisma.appointment.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce(createdRow)

    const res = await POST(makePostRequest(VALID_POST_BODY))
    const body = await (res as Response).json()

    expect(res.status).toBe(200)
    expect(body.id).toBe(CUID_APT)
    expect(body.status).toBe('CONFIRMED')

    // Vérifier que create() a bien reçu l'organizationId de la SESSION (pas du body)
    const createCall = (prisma.appointment.create as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(createCall.data.organizationId).toBe(CUID_ORG)
  })

  it('retourne 400 si le body est invalide (duration négative)', async () => {
    mockSession()

    const res = await POST(makePostRequest({ ...VALID_POST_BODY, duration: -5 }))

    expect(res.status).toBe(400)
    const body = await (res as Response).json()
    expect(body.error).toBe('Invalid input')
  })

  it('retourne 400 si le body est invalide (serviceId vide)', async () => {
    mockSession()

    const res = await POST(makePostRequest({ ...VALID_POST_BODY, serviceId: '' }))

    expect(res.status).toBe(400)
  })

  it('retourne 401 si non authentifié', async () => {
    ;(auth as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null)

    const res = await POST(makePostRequest(VALID_POST_BODY))

    expect(res.status).toBe(401)
  })
})

// ===========================================================================
//  DELETE /api/appointments
// ===========================================================================

describe('DELETE /api/appointments', () => {
  it('supprime un RDV et retourne { ok: true }', async () => {
    mockSession()
    ;(prisma.appointment.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: CUID_APT, status: 'CONFIRMED', finalPrice: null, staffId: CUID_STAFF,
    })
    ;(prisma.appointment.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ count: 1 })

    const res = await DELETE(makeDeleteRequest(CUID_APT))
    const body = await (res as Response).json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)

    // deleteMany doit inclure l'organizationId (Anti-IDOR atomique)
    const deleteCall = (prisma.appointment.deleteMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(deleteCall.where.organizationId).toBe(CUID_ORG)
    expect(deleteCall.where.id).toBe(CUID_APT)
  })

  it('🔒 Anti-IDOR — retourne 404 si le RDV appartient à une autre organisation', async () => {
    // Session org A essaie de supprimer un RDV qui n'existe pas sous org A
    mockSession(CUID_ORG)
    // findFirst retourne null car le where { id, organizationId: orgA } ne match pas
    ;(prisma.appointment.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null)

    const res = await DELETE(makeDeleteRequest(CUID_APT))

    expect(res.status).toBe(404)
    // deleteMany ne doit JAMAIS être appelé dans ce cas
    expect(prisma.appointment.deleteMany).not.toHaveBeenCalled()
  })

  it('refuse de supprimer un RDV PAYÉ — retourne 403', async () => {
    mockSession()
    ;(prisma.appointment.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: CUID_APT, status: 'PAID', finalPrice: 50, staffId: CUID_STAFF,
    })

    const res = await DELETE(makeDeleteRequest(CUID_APT))

    expect(res.status).toBe(403)
    const body = await (res as Response).json()
    expect(body.error).toMatch(/paid/i)
    expect(prisma.appointment.deleteMany).not.toHaveBeenCalled()
  })

  it('retourne 400 si l\'id n\'est pas un CUID valide', async () => {
    mockSession()

    const res = await DELETE(
      new Request('http://localhost/api/appointments?id=invalid-id-not-cuid', { method: 'DELETE' })
    )

    expect(res.status).toBe(400)
    expect(prisma.appointment.findFirst).not.toHaveBeenCalled()
  })

  it('retourne 401 si non authentifié', async () => {
    ;(auth as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null)

    const res = await DELETE(makeDeleteRequest(CUID_APT))

    expect(res.status).toBe(401)
  })
})


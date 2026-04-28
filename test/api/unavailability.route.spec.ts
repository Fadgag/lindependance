import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mocks -----------------------------------------------------------------

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    unavailability: {
      createMany: vi.fn(),
      findFirst: vi.fn(),
      deleteMany: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

vi.mock('../../src/auth', () => ({ auth: vi.fn() }))

// --- Imports (after mocks) -------------------------------------------------

import { POST, DELETE } from '../../src/app/api/unavailability/route'
import { prisma } from '../../src/lib/prisma'
import { auth } from '../../src/auth'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CUID_ORG   = 'ctest_org_aaa0000000001'
const CUID_ID    = 'ctest_idu_bbb0000000001'
const CUID_GRP   = 'ctest_grp_ccc0000000001'
const CUID_ORG_B = 'ctest_org_fff0000000002'

function mockSession(orgId = CUID_ORG) {
  ;(auth as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ user: { organizationId: orgId } })
}

function makePostRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/unavailability', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeDeleteRequest(id: string, deleteAll = false) {
  const qs = deleteAll ? `?id=${id}&deleteAll=1` : `?id=${id}`
  return new Request(`http://localhost/api/unavailability${qs}`, { method: 'DELETE' })
}

const START = '2026-05-05T09:00:00.000Z'
const END   = '2026-05-05T10:00:00.000Z'

// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.resetAllMocks()
})

// ===========================================================================
//  POST /api/unavailability
// ===========================================================================

describe('POST /api/unavailability', () => {
  it('crée une occurrence unique (NONE) — createMany appelé avec 1 row', async () => {
    mockSession()
    ;(prisma.unavailability.createMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ count: 1 })

    const res = await POST(makePostRequest({ title: 'Congé', start: START, end: END, recurrence: 'NONE' }))
    const body = await (res as Response).json()

    expect(res.status).toBe(201)
    expect(body.count).toBe(1)
    expect(body.recurrence).toBe('NONE')

    const createCall = (prisma.unavailability.createMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(createCall.data).toHaveLength(1)
    expect(createCall.data[0].organizationId).toBe(CUID_ORG)
    expect(createCall.data[0].recurrenceGroupId).toBeNull()
  })

  it('récurrence WEEKLY — createMany reçoit ~26 occurrences sur 6 mois', async () => {
    mockSession()
    ;(prisma.unavailability.createMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ count: 26 })

    const res = await POST(makePostRequest({ title: 'Formation', start: START, end: END, recurrence: 'WEEKLY' }))
    const body = await (res as Response).json()

    expect(res.status).toBe(201)

    const createCall = (prisma.unavailability.createMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    const rows = createCall.data as Array<{ organizationId: string; recurrenceGroupId: string | null }>

    // ~26 occurrences sur 6 mois (25–27 selon le mois de départ)
    expect(rows.length).toBeGreaterThanOrEqual(25)
    expect(rows.length).toBeLessThanOrEqual(27)

    // Toutes les occurrences partagent le même recurrenceGroupId non-null
    const groupId = rows[0].recurrenceGroupId
    expect(groupId).not.toBeNull()
    rows.forEach((r) => {
      expect(r.recurrenceGroupId).toBe(groupId)
      expect(r.organizationId).toBe(CUID_ORG)
    })
  })

  it('retourne 400 si start >= end', async () => {
    mockSession()

    const res = await POST(makePostRequest({ title: 'Test', start: END, end: START }))

    expect(res.status).toBe(400)
    expect(prisma.unavailability.createMany).not.toHaveBeenCalled()
  })

  it('retourne 400 si title manquant', async () => {
    mockSession()

    const res = await POST(makePostRequest({ start: START, end: END }))

    expect(res.status).toBe(400)
  })

  it('retourne 401 si non authentifié', async () => {
    ;(auth as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null)

    const res = await POST(makePostRequest({ title: 'X', start: START, end: END }))

    expect(res.status).toBe(401)
  })
})

// ===========================================================================
//  DELETE /api/unavailability
// ===========================================================================

describe('DELETE /api/unavailability', () => {
  it('supprime une occurrence seule — deleteMany avec id + organizationId', async () => {
    mockSession()
    ;(prisma.unavailability.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: CUID_ID, recurrenceGroupId: CUID_GRP,
    })
    ;(prisma.unavailability.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ count: 1 })

    const res = await DELETE(makeDeleteRequest(CUID_ID, false))
    const body = await (res as Response).json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)

    const deleteCall = (prisma.unavailability.deleteMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    // Doit supprimer par id ET organizationId (Anti-IDOR atomique)
    expect(deleteCall.where.id).toBe(CUID_ID)
    expect(deleteCall.where.organizationId).toBe(CUID_ORG)
    // NE doit pas supprimer par recurrenceGroupId (car deleteAll=false)
    expect(deleteCall.where.recurrenceGroupId).toBeUndefined()
  })

  it('supprime la série entière (deleteAll=1) — deleteMany par recurrenceGroupId + organizationId', async () => {
    mockSession()
    ;(prisma.unavailability.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: CUID_ID, recurrenceGroupId: CUID_GRP,
    })
    ;(prisma.unavailability.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ count: 26 })

    const res = await DELETE(makeDeleteRequest(CUID_ID, true))

    expect(res.status).toBe(200)

    const deleteCall = (prisma.unavailability.deleteMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    // Doit supprimer par recurrenceGroupId + organizationId
    expect(deleteCall.where.recurrenceGroupId).toBe(CUID_GRP)
    expect(deleteCall.where.organizationId).toBe(CUID_ORG)
  })

  it('🔒 Anti-IDOR — retourne 404 si l\'indisponibilité appartient à une autre organisation', async () => {
    // Session org A essaie de supprimer une indispo qui n'existe pas sous org A → findFirst null
    mockSession(CUID_ORG)
    ;(prisma.unavailability.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null)

    const res = await DELETE(makeDeleteRequest(CUID_ID))

    expect(res.status).toBe(404)
    // deleteMany ne doit jamais être appelé
    expect(prisma.unavailability.deleteMany).not.toHaveBeenCalled()
  })

  it('retourne 400 si id manquant', async () => {
    mockSession()

    const res = await DELETE(
      new Request('http://localhost/api/unavailability', { method: 'DELETE' })
    )

    expect(res.status).toBe(400)
  })

  it('retourne 401 si non authentifié', async () => {
    ;(auth as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null)

    const res = await DELETE(makeDeleteRequest(CUID_ID))

    expect(res.status).toBe(401)
  })
})


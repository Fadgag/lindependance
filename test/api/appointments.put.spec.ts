import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mocks -----------------------------------------------------------------

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    appointment: {
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}))

vi.mock('../../src/auth', () => ({ auth: vi.fn() }))

// --- Imports (after mocks) -------------------------------------------------

import { PUT } from '../../src/app/api/appointments/route'
import { prisma } from '../../src/lib/prisma'
import { auth } from '../../src/auth'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CUID_ORG   = 'ctest_org_aaa0000000001'
const CUID_APT   = 'ctest_apt_bbb0000000001'
const CUID_SVC   = 'ctest_svc_ccc0000000001'
const CUID_CUST  = 'ctest_cus_ddd0000000001'
const CUID_STAFF = 'ctest_stf_eee0000000001'
const CUID_ORG_B = 'ctest_org_fff0000000002'
const CUID_APT_B = 'ctest_apt_ggg0000000003'

const NOW   = new Date('2026-05-01T10:00:00.000Z')
const LATER = new Date('2026-05-01T11:00:00.000Z')

function mockSession(orgId = CUID_ORG) {
  ;(auth as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ user: { organizationId: orgId } })
}

function makePutRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/appointments', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const VALID_PUT_BODY = {
  id:        CUID_APT,
  start:     NOW.toISOString(),
  end:       LATER.toISOString(),
  duration:  60,
  serviceId: CUID_SVC,
  customerId: CUID_CUST,
}

const EXISTING_APT = {
  id:       CUID_APT,
  status:   'CONFIRMED',
  finalPrice: null,
  staffId:  CUID_STAFF,
}

const UPDATED_APT = {
  id:        CUID_APT,
  startTime: NOW,
  endTime:   LATER,
  duration:  60,
  serviceId: CUID_SVC,
  customerId: CUID_CUST,
  note:      null,
}

// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.resetAllMocks()
})

// ===========================================================================
//  PUT /api/appointments
// ===========================================================================

describe('PUT /api/appointments', () => {
  it('met à jour un RDV et retourne l\'objet mis à jour — organizationId injecté depuis la session', async () => {
    mockSession()
    // 1st findFirst → existence check (Anti-IDOR)
    ;(prisma.appointment.findFirst as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(EXISTING_APT)
    // 2nd findFirst → conflict check (returns null = no conflict)
    ;(prisma.appointment.findFirst as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(null)
    // updateMany → success
    ;(prisma.appointment.updateMany as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ count: 1 })
    // 3rd findFirst → fetch updated record
    ;(prisma.appointment.findFirst as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(UPDATED_APT)

    const res = await PUT(makePutRequest(VALID_PUT_BODY))
    const body = await (res as Response).json()

    expect(res.status).toBe(200)
    expect(body.id).toBe(CUID_APT)

    // updateMany doit contenir l'organizationId de la session (Anti-IDOR atomique)
    const updateCall = (prisma.appointment.updateMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(updateCall.where.organizationId).toBe(CUID_ORG)
    expect(updateCall.where.id).toBe(CUID_APT)
  })

  it('retourne 409 si conflit horaire détecté et force=false (ou absent)', async () => {
    mockSession()
    // existence check → OK
    ;(prisma.appointment.findFirst as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(EXISTING_APT)
    // conflict check → conflit trouvé
    ;(prisma.appointment.findFirst as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ id: CUID_APT_B })

    const res = await PUT(makePutRequest({ ...VALID_PUT_BODY, force: false }))

    expect(res.status).toBe(409)
    const body = await (res as Response).json()
    expect(body.error).toMatch(/conflit/i)
    expect(prisma.appointment.updateMany).not.toHaveBeenCalled()
  })

  it('bypasse le conflit horaire si force=true', async () => {
    mockSession()
    // existence check → OK
    ;(prisma.appointment.findFirst as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(EXISTING_APT)
    // Pas de 2ème findFirst pour le conflit (force=true skips it)
    // updateMany → success
    ;(prisma.appointment.updateMany as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ count: 1 })
    // fetch updated record
    ;(prisma.appointment.findFirst as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(UPDATED_APT)

    const res = await PUT(makePutRequest({ ...VALID_PUT_BODY, force: true }))

    expect(res.status).toBe(200)
    expect(prisma.appointment.updateMany).toHaveBeenCalledOnce()
  })

  it('🔒 Anti-IDOR — retourne 404 si le RDV appartient à une autre organisation', async () => {
    // Session org B essaie de modifier un RDV qui n'existe pas sous org B
    mockSession(CUID_ORG_B)
    // findFirst retourne null → org B ne peut pas voir ce RDV
    ;(prisma.appointment.findFirst as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(null)

    const res = await PUT(makePutRequest(VALID_PUT_BODY))

    expect(res.status).toBe(404)
    expect(prisma.appointment.updateMany).not.toHaveBeenCalled()
  })

  it('retourne 400 si le body est invalide (id absent)', async () => {
    mockSession()

    const { id: _omitted, ...bodyWithoutId } = VALID_PUT_BODY
    const res = await PUT(makePutRequest(bodyWithoutId))

    expect(res.status).toBe(400)
    const body = await (res as Response).json()
    expect(body.error).toBe('Invalid input')
    expect(prisma.appointment.findFirst).not.toHaveBeenCalled()
  })

  it('retourne 401 si non authentifié', async () => {
    ;(auth as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null)

    const res = await PUT(makePutRequest(VALID_PUT_BODY))

    expect(res.status).toBe(401)
    expect(prisma.appointment.findFirst).not.toHaveBeenCalled()
  })
})


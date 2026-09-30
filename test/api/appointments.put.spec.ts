import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mocks -----------------------------------------------------------------

vi.mock('../../src/auth', () => ({ auth: vi.fn() }))
vi.mock('../../src/services/appointmentScheduling.service', () => ({
  createStaffAppointment: vi.fn(),
  updateStaffAppointment: vi.fn(),
}))

// --- Imports (after mocks) -------------------------------------------------

import { PUT } from '../../src/app/api/appointments/route'
import { auth } from '../../src/auth'
import { updateStaffAppointment } from '../../src/services/appointmentScheduling.service'
import { CustomerPortalHttpError } from '../../src/services/customerPortal.service'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CUID_ORG   = 'ctest_org_aaa0000000001'
const CUID_APT   = 'ctest_apt_bbb0000000001'
const CUID_SVC   = 'ctest_svc_ccc0000000001'
const CUID_CUST  = 'ctest_cus_ddd0000000001'
const CUID_ORG_B = 'ctest_org_fff0000000002'

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
    vi.mocked(updateStaffAppointment).mockResolvedValueOnce(UPDATED_APT as never)

    const res = await PUT(makePutRequest(VALID_PUT_BODY))
    const body = await (res as Response).json()

    expect(res.status).toBe(200)
    expect(body.id).toBe(CUID_APT)

    expect(updateStaffAppointment).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: CUID_ORG,
      id: CUID_APT,
    }))
  })

  it('retourne 409 si conflit horaire détecté et force=false (ou absent)', async () => {
    mockSession()
    vi.mocked(updateStaffAppointment).mockRejectedValueOnce(new CustomerPortalHttpError(409, 'Conflit horaire détecté'))

    const res = await PUT(makePutRequest({ ...VALID_PUT_BODY, force: false }))

    expect(res.status).toBe(409)
    const body = await (res as Response).json()
    expect(body.error).toMatch(/conflit/i)
    expect(updateStaffAppointment).toHaveBeenCalledOnce()
  })

  it('refuse les conflits même si un ancien client envoie force=true', async () => {
    mockSession()
    vi.mocked(updateStaffAppointment).mockRejectedValueOnce(new CustomerPortalHttpError(409, 'Conflit horaire détecté'))

    const res = await PUT(makePutRequest({ ...VALID_PUT_BODY, force: true }))

    expect(res.status).toBe(409)
    expect(updateStaffAppointment).toHaveBeenCalledOnce()
  })

  it('🔒 Anti-IDOR — retourne 404 si le RDV appartient à une autre organisation', async () => {
    // Session org B essaie de modifier un RDV qui n'existe pas sous org B
    mockSession(CUID_ORG_B)
    vi.mocked(updateStaffAppointment).mockResolvedValueOnce(null)

    const res = await PUT(makePutRequest(VALID_PUT_BODY))

    expect(res.status).toBe(404)
    expect(updateStaffAppointment).toHaveBeenCalledOnce()
  })

  it('retourne 400 si le body est invalide (id absent)', async () => {
    mockSession()

    const { id: _omitted, ...bodyWithoutId } = VALID_PUT_BODY
    void _omitted
    const res = await PUT(makePutRequest(bodyWithoutId))

    expect(res.status).toBe(400)
    const body = await (res as Response).json()
    expect(body.error).toBe('Invalid input')
    expect(updateStaffAppointment).not.toHaveBeenCalled()
  })

  it('retourne 401 si non authentifié', async () => {
    ;(auth as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null)

    const res = await PUT(makePutRequest(VALID_PUT_BODY))

    expect(res.status).toBe(401)
    expect(updateStaffAppointment).not.toHaveBeenCalled()
  })

  it('retourne 404 si le rendez-vous disparait pendant la mise à jour', async () => {
    mockSession()
    vi.mocked(updateStaffAppointment).mockResolvedValueOnce(null)

    const res = await PUT(makePutRequest(VALID_PUT_BODY))

    expect(res.status).toBe(404)
    const body = await (res as Response).json()
    expect(body.error).toBe('Not found')
  })
})

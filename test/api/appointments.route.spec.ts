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
vi.mock('../../src/services/appointmentScheduling.service', () => ({
  createStaffAppointment: vi.fn(),
  updateStaffAppointment: vi.fn(),
  deleteStaffAppointment: vi.fn(),
}))

// --- Imports (after mocks) -------------------------------------------------

import { POST, DELETE } from '../../src/app/api/appointments/route'
import { prisma } from '../../src/lib/prisma'
import { auth } from '../../src/auth'
import {
  createStaffAppointment,
  deleteStaffAppointment,
} from '../../src/services/appointmentScheduling.service'
import { CustomerPortalHttpError } from '../../src/services/customerPortal.service'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Zod cuid() accepts strings matching /^c[^\s-]{8,}$/i
const CUID_ORG   = 'ctest_org_aaa0000000001'
const CUID_APT   = 'ctest_apt_bbb0000000001'
const CUID_SVC   = 'ctest_svc_ccc0000000001'
const CUID_CUST  = 'ctest_cus_ddd0000000001'
const CUID_STAFF = 'ctest_stf_eee0000000001'

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
  vi.mocked(deleteStaffAppointment).mockResolvedValue(true)
})

// ===========================================================================
//  POST /api/appointments
// ===========================================================================

describe('POST /api/appointments', () => {
  it('crée un RDV et retourne l\'objet créé — organizationId injecté depuis la session (jamais du body)', async () => {
    mockSession()
    const createdRow = {
      id: CUID_APT,
      startTime: NOW, endTime: LATER, status: 'CONFIRMED',
      finalPrice: null, price: 50, serviceId: CUID_SVC,
      customerId: CUID_CUST, staffId: CUID_STAFF, note: null, duration: 60,
    }
    vi.mocked(createStaffAppointment).mockResolvedValueOnce(createdRow as never)

    const res = await POST(makePostRequest(VALID_POST_BODY))
    const body = await (res as Response).json()

    expect(res.status).toBe(200)
    expect(body.id).toBe(CUID_APT)
    expect(body.status).toBe('CONFIRMED')

    expect(createStaffAppointment).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: CUID_ORG,
      serviceId: CUID_SVC,
      customerId: CUID_CUST,
    }))
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

  it('décrémente les sessions du forfait si customerPackageId est fourni (L161)', async () => {
    mockSession()
    const createdRow = {
      id: CUID_APT, startTime: NOW, endTime: LATER, status: 'CONFIRMED',
      finalPrice: null, price: 50, serviceId: CUID_SVC,
      customerId: CUID_CUST, staffId: CUID_STAFF, note: null, duration: 60,
    }
    vi.mocked(createStaffAppointment).mockResolvedValueOnce(createdRow as never)

    const CUID_PKG = 'ctest_pkg_hhh0000000007'
    const res = await POST(makePostRequest({ ...VALID_POST_BODY, customerPackageId: CUID_PKG }))

    expect(res.status).toBe(200)
    expect(createStaffAppointment).toHaveBeenCalledWith(expect.objectContaining({
      customerPackageId: CUID_PKG,
      organizationId: CUID_ORG,
    }))
  })
})

// ===========================================================================
//  DELETE /api/appointments — edge cases
// ===========================================================================

describe('DELETE /api/appointments — edge cases', () => {
  it('accepte l\'id depuis le body JSON (priorité body > query param)', async () => {
    mockSession()

    // id passé via body JSON (L250-254)
    const req = new Request('http://localhost/api/appointments', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: CUID_APT }),
    })
    const res = await DELETE(req)

    expect(res.status).toBe(200)
    const body = await (res as Response).json()
    expect(body.ok).toBe(true)
    expect(deleteStaffAppointment).toHaveBeenCalledWith({
      id: CUID_APT,
      organizationId: CUID_ORG,
    })
  })

  it('retourne 400 si from=checkout sans confirm=true (L282)', async () => {
    mockSession()

    const req = new Request(
      `http://localhost/api/appointments?id=${CUID_APT}&from=checkout`,
      { method: 'DELETE' }
    )
    const res = await DELETE(req)

    expect(res.status).toBe(400)
    const body = await (res as Response).json()
    expect(body.error).toMatch(/confirmation/i)
    expect(deleteStaffAppointment).not.toHaveBeenCalled()
  })

  it('supprime avec confirm=true depuis checkout (L284+)', async () => {
    mockSession()

    const req = new Request(
      `http://localhost/api/appointments?id=${CUID_APT}&from=checkout&confirm=true`,
      { method: 'DELETE' }
    )
    const res = await DELETE(req)

    expect(res.status).toBe(200)
  })
})

// ===========================================================================
//  DELETE /api/appointments
// ===========================================================================

describe('DELETE /api/appointments', () => {
  it('supprime un RDV et retourne { ok: true }', async () => {
    mockSession()

    const res = await DELETE(makeDeleteRequest(CUID_APT))
    const body = await (res as Response).json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)

    expect(deleteStaffAppointment).toHaveBeenCalledWith({
      id: CUID_APT,
      organizationId: CUID_ORG,
    })
  })

  it('🔒 Anti-IDOR — retourne 404 si le RDV appartient à une autre organisation', async () => {
    // Session org A essaie de supprimer un RDV qui n'existe pas sous org A
    mockSession(CUID_ORG)
    vi.mocked(deleteStaffAppointment).mockResolvedValueOnce(false)

    const res = await DELETE(makeDeleteRequest(CUID_APT))

    expect(res.status).toBe(404)
    expect(deleteStaffAppointment).toHaveBeenCalledWith({
      id: CUID_APT,
      organizationId: CUID_ORG,
    })
  })

  it('refuse de supprimer un RDV PAYÉ — retourne 403', async () => {
    mockSession()
    vi.mocked(deleteStaffAppointment).mockRejectedValueOnce(
      new CustomerPortalHttpError(403, 'Cannot delete a paid appointment'),
    )

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

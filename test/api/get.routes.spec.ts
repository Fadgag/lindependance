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

  it('retourne le mapping complet (title, service, customer, extras, extendedProps)', async () => {
    mockSession()
    const row = {
      id: CUID_APT,
      startTime: NOW,
      endTime: LATER,
      status: 'CONFIRMED',
      finalPrice: null,
      price: 50,
      serviceId: CUID_SVC,
      customerId: CUID_CUST,
      staffId: CUID_STAFF,
      note: 'ma note',
      duration: 60,
      extras: null,
      soldProducts: JSON.stringify([{ priceTTC: 10, quantity: 2, totalTTC: 20, name: 'Sérum' }]),
      paymentMethod: 'CB',
      service: { id: CUID_SVC, name: 'Coupe', price: 50, color: '#ff0000' },
      customer: { id: CUID_CUST, firstName: 'Alice', lastName: 'Dupont' },
    }
    ;(prisma.appointment.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([row])

    const res = await getAppointments(makeGetRequest('/api/appointments'))
    const body = await (res as Response).json()

    expect(res.status).toBe(200)
    expect(body).toHaveLength(1)
    const apt = body[0]
    // title composé depuis customer + service
    expect(apt.title).toBe('Alice Dupont — Coupe')
    // service mapping
    expect(apt.service.name).toBe('Coupe')
    expect(apt.service.price).toBe(50)
    expect(apt.color).toBe('#ff0000')
    // customer mapping
    expect(apt.customer.name).toBe('Alice Dupont')
    // soldProducts parsés
    expect(apt.soldProducts).toHaveLength(1)
    expect(apt.soldProducts[0].name).toBe('Sérum')
    // extendedProps présents
    expect(apt.extendedProps.note).toBe('ma note')
    expect(apt.extendedProps.duration).toBe(60)
    // paymentMethod
    expect(apt.paymentMethod).toBe('CB')
  })

  it('filtre les RDV sans startTime (startTime null → exclus du résultat)', async () => {
    mockSession()
    const rows = [
      { id: CUID_APT, startTime: NOW, endTime: LATER, status: 'CONFIRMED', finalPrice: null, price: 0,
        serviceId: CUID_SVC, customerId: CUID_CUST, staffId: CUID_STAFF, note: null, duration: 60,
        extras: null, soldProducts: null, paymentMethod: null,
        service: { id: CUID_SVC, name: 'Coupe', price: 0, color: null },
        customer: { id: CUID_CUST, firstName: 'Bob', lastName: 'Martin' } },
      // row sans startTime → doit être filtrée
      { id: 'ctest_apt_zzz0000000099', startTime: null, endTime: null, status: 'CONFIRMED',
        finalPrice: null, price: 0, serviceId: CUID_SVC, customerId: CUID_CUST, staffId: null,
        note: null, duration: 0, extras: null, soldProducts: null, paymentMethod: null,
        service: null, customer: null },
    ]
    ;(prisma.appointment.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce(rows)

    const res = await getAppointments(makeGetRequest('/api/appointments'))
    const body = await (res as Response).json()

    expect(res.status).toBe(200)
    // Seul le RDV avec startTime est retourné
    expect(body).toHaveLength(1)
    expect(body[0].id).toBe(CUID_APT)
  })

  it('filtre par plage de dates — where.startTime injecté dans findMany', async () => {
    mockSession()
    ;(prisma.appointment.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([])

    const res = await getAppointments(makeGetRequest('/api/appointments', {
      start: '2026-05-01T00:00:00.000Z',
      end:   '2026-05-07T23:59:59.000Z',
    }))

    expect(res.status).toBe(200)
    const findCall = (prisma.appointment.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(findCall.where.startTime).toBeDefined()
    expect(findCall.where.startTime.gte).toBeInstanceOf(Date)
    expect(findCall.where.startTime.lte).toBeInstanceOf(Date)
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




import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mocks -----------------------------------------------------------------

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    appointment: { findMany: vi.fn(), count: vi.fn() },
  },
}))

import { prisma } from '../../src/lib/prisma'
import { getDashboardDetails } from '../../src/services/dashboard.service'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CUID_ORG  = 'ctest_org_aaa0000000001'
const CUID_APT  = 'ctest_apt_bbb0000000001'
const CUID_APT2 = 'ctest_apt_ccc0000000002'

const FROM = new Date('2026-04-01T00:00:00.000Z')
const TO   = new Date('2026-04-30T23:59:59.000Z')

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id:           CUID_APT,
    startTime:    new Date('2026-04-10T10:00:00.000Z'),
    status:       'CONFIRMED',
    finalPrice:   null,
    price:        50,
    soldProducts: null,
    customer: { firstName: 'Alice', lastName: 'Dupont' },
    service:  { name: 'Coupe', price: 50 },
    ...overrides,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
})

// ===========================================================================
//  getDashboardDetails
// ===========================================================================

describe('getDashboardDetails', () => {
  it('retourne les items + total + totals pour un RDV simple', async () => {
    const row = makeRow()
    // findMany appelé 2 fois : rows (paginés) + allForTotals
    ;(prisma.appointment.findMany as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([row])   // rows paginés
      .mockResolvedValueOnce([row])   // allForTotals
    ;(prisma.appointment.count as ReturnType<typeof vi.fn>).mockResolvedValueOnce(1)

    const res = await getDashboardDetails(CUID_ORG, FROM, TO)

    expect(res.items).toHaveLength(1)
    expect(res.items[0].clientName).toBe('Alice Dupont')
    expect(res.items[0].serviceName).toBe('Coupe')
    expect(res.items[0].totalTTC).toBeCloseTo(50)
    expect(res.total).toBe(1)
    expect(res.totals.totalAmount).toBeCloseTo(50)
    expect(res.totals.totalServicesSum).toBeCloseTo(50)
    expect(res.totals.totalProductsSum).toBe(0)
  })

  it('🔒 Anti-IDOR — where.organizationId est toujours injecté dans findMany', async () => {
    ;(prisma.appointment.findMany as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
    ;(prisma.appointment.count as ReturnType<typeof vi.fn>).mockResolvedValueOnce(0)

    await getDashboardDetails(CUID_ORG, FROM, TO)

    const firstCall = (prisma.appointment.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(firstCall.where.organizationId).toBe(CUID_ORG)
  })

  it('calcule totalTTC depuis finalPrice si disponible', async () => {
    const row = makeRow({ finalPrice: 75 })
    ;(prisma.appointment.findMany as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([row])
      .mockResolvedValueOnce([{ finalPrice: 75, service: { price: 50 }, soldProducts: null, productsTotal: null }])
    ;(prisma.appointment.count as ReturnType<typeof vi.fn>).mockResolvedValueOnce(1)

    const res = await getDashboardDetails(CUID_ORG, FROM, TO)

    expect(res.items[0].totalTTC).toBeCloseTo(75)
    expect(res.totals.totalAmount).toBeCloseTo(75)
  })

  it('inclut les produits vendus dans productsSum et totalTTC', async () => {
    const soldProducts = JSON.stringify([{ priceTTC: 20, quantity: 1, totalTTC: 20, name: 'Sérum' }])
    const row = makeRow({ soldProducts, finalPrice: null })
    ;(prisma.appointment.findMany as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([row])
      .mockResolvedValueOnce([{ finalPrice: null, service: { price: 50 }, soldProducts, productsTotal: null }])
    ;(prisma.appointment.count as ReturnType<typeof vi.fn>).mockResolvedValueOnce(1)

    const res = await getDashboardDetails(CUID_ORG, FROM, TO)

    expect(res.items[0].productsSum).toBeCloseTo(20)
    expect(res.items[0].totalTTC).toBeCloseTo(70)          // service + produits
    expect(res.totals.totalProductsSum).toBeCloseTo(20)
  })

  it('filtre filter="services" — injecte la condition soldProducts dans le where', async () => {
    ;(prisma.appointment.findMany as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
    ;(prisma.appointment.count as ReturnType<typeof vi.fn>).mockResolvedValueOnce(0)

    await getDashboardDetails(CUID_ORG, FROM, TO, 'services')

    const firstCall = (prisma.appointment.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    // La requête 'services' doit contenir une clause AND sur soldProducts
    expect(firstCall.where.AND).toBeDefined()
  })

  it('filtre filter="products" — injecte la condition productsTotal dans le where', async () => {
    ;(prisma.appointment.findMany as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
    ;(prisma.appointment.count as ReturnType<typeof vi.fn>).mockResolvedValueOnce(0)

    await getDashboardDetails(CUID_ORG, FROM, TO, 'products')

    const firstCall = (prisma.appointment.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(firstCall.where.AND).toBeDefined()
  })

  it('filtre onlyPaid=true — injecte clause AND OR sur status', async () => {
    ;(prisma.appointment.findMany as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
    ;(prisma.appointment.count as ReturnType<typeof vi.fn>).mockResolvedValueOnce(0)

    await getDashboardDetails(CUID_ORG, FROM, TO, 'all', 1, 50, true)

    const firstCall = (prisma.appointment.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    // onlyPaid ajoute un AND avec OR [PAID, PAYED, finalPrice > 0]
    expect(firstCall.where.AND).toBeDefined()
  })

  it('pagination — skip et take injectés correctement', async () => {
    ;(prisma.appointment.findMany as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
    ;(prisma.appointment.count as ReturnType<typeof vi.fn>).mockResolvedValueOnce(0)

    await getDashboardDetails(CUID_ORG, FROM, TO, 'all', 3, 25)

    const firstCall = (prisma.appointment.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(firstCall.skip).toBe(50)   // (3-1) * 25
    expect(firstCall.take).toBe(25)
  })

  it('retourne clientName "—" si customer est null', async () => {
    const row = makeRow({ customer: null })
    ;(prisma.appointment.findMany as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([row])
      .mockResolvedValueOnce([{ finalPrice: null, service: { price: 50 }, soldProducts: null, productsTotal: null }])
    ;(prisma.appointment.count as ReturnType<typeof vi.fn>).mockResolvedValueOnce(1)

    const res = await getDashboardDetails(CUID_ORG, FROM, TO)

    expect(res.items[0].clientName).toBe('—')
  })
})


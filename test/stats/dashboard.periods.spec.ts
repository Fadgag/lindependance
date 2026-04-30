import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mocks -----------------------------------------------------------------

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    appointment: { findMany: vi.fn(), count: vi.fn() },
    staff: { count: vi.fn() },
    customer: { count: vi.fn() },
  },
}))

import { prisma } from '../../src/lib/prisma'
import dashboardService from '../../src/services/dashboard.service'

beforeEach(() => {
  vi.resetAllMocks()
  ;(prisma.staff.count as ReturnType<typeof vi.fn>).mockResolvedValue(1)
  ;(prisma.customer.count as ReturnType<typeof vi.fn>).mockResolvedValue(0)
})

// ===========================================================================
//  Variantes de période
// ===========================================================================

describe('getDashboardForOrg — variantes de période', () => {
  const emptyMock = () => {
    ;(prisma.appointment.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([])
  }

  it('accepte la période "today" sans erreur', async () => {
    emptyMock()
    const res = await dashboardService.getDashboardForOrg('org-1', 'today')
    expect(res.summary).toBeDefined()
    expect(res.timeseries.length).toBeGreaterThanOrEqual(1)
  })

  it('accepte la période "week" sans erreur', async () => {
    emptyMock()
    const res = await dashboardService.getDashboardForOrg('org-1', 'week')
    expect(res.timeseries.length).toBeGreaterThanOrEqual(7)
  })

  it('accepte la période "month" sans erreur', async () => {
    emptyMock()
    const res = await dashboardService.getDashboardForOrg('org-1', 'month')
    expect(res.timeseries.length).toBeGreaterThanOrEqual(28)
  })

  it('utilise "30days" par défaut (no arg)', async () => {
    emptyMock()
    const res = await dashboardService.getDashboardForOrg('org-1')
    expect(res.timeseries.length).toBeGreaterThanOrEqual(30)
  })
})

// ===========================================================================
//  RDV PAID — realizedRevenue
// ===========================================================================

describe('getDashboardForOrg — RDV PAID', () => {
  it('comptabilise le CA réalisé uniquement pour les RDV PAID', async () => {
    const rows = [
      { startTime: new Date('2025-01-02T10:00:00Z'), status: 'PAID',      service: { price: 80 }, soldProducts: null, finalPrice: null },
      { startTime: new Date('2025-01-02T14:00:00Z'), status: 'CONFIRMED', service: { price: 50 }, soldProducts: null, finalPrice: null },
    ]
    ;(prisma.appointment.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce(rows)

    const res = await dashboardService.getDashboardForOrg('org-1', { start: new Date('2025-01-01'), end: new Date('2025-01-05') })

    // realizedRevenue = seulement PAID (80)
    expect(res.summary.realizedRevenue).toBeCloseTo(80)
    // projectedRevenue = tous les RDV (80 + 50)
    expect(res.summary.projectedRevenue).toBeCloseTo(130)
    expect(res.summary.appointmentCount).toBe(2)
  })
})

// ===========================================================================
//  soldProducts JSON parsing dans getDashboardForOrg
// ===========================================================================

describe('getDashboardForOrg — soldProducts', () => {
  it('additionne les produits vendus dans le CA projeté', async () => {
    const products = JSON.stringify([
      { priceTTC: 15, quantity: 2, totalTTC: 30, taxRate: 20, totalTax: 5 },
    ])
    const rows = [
      { startTime: new Date('2025-02-01T10:00:00Z'), status: 'CONFIRMED', service: { price: 50 }, soldProducts: products, finalPrice: null },
    ]
    ;(prisma.appointment.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce(rows)

    const res = await dashboardService.getDashboardForOrg('org-1', { start: new Date('2025-02-01'), end: new Date('2025-02-01') })

    // projected = service (50) + products (30) = 80
    expect(res.summary.projectedRevenue).toBeCloseTo(80)
  })

  it('parse les soldProducts en string JSON (format legacy)', async () => {
    const soldStr = JSON.stringify([{ priceTTC: 20, quantity: 1, totalTTC: 20, taxRate: 10, totalTax: 2 }])
    const rows = [
      { startTime: new Date('2025-02-01T10:00:00Z'), status: 'PAID', service: { price: 0 }, soldProducts: soldStr, finalPrice: null },
    ]
    ;(prisma.appointment.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce(rows)

    const res = await dashboardService.getDashboardForOrg('org-1', { start: new Date('2025-02-01'), end: new Date('2025-02-01') })

    expect(res.summary.realizedRevenue).toBeCloseTo(20)
    expect(res.summary.productRevenue).toBeCloseTo(20)
    // taxe collectée = totalTax du produit
    expect(res.summary.totalTaxCollected).toBeCloseTo(2)
  })

  it('ignore les soldProducts invalides (JSON malformé) sans planter', async () => {
    const rows = [
      { startTime: new Date('2025-02-01T10:00:00Z'), status: 'CONFIRMED', service: { price: 40 }, soldProducts: 'NOT_JSON', finalPrice: null },
    ]
    ;(prisma.appointment.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce(rows)

    const res = await dashboardService.getDashboardForOrg('org-1', { start: new Date('2025-02-01'), end: new Date('2025-02-01') })

    // soldProducts ignorés → seulement le prix du service
    expect(res.summary.projectedRevenue).toBeCloseTo(40)
  })
})


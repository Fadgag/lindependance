import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import { PrismaClient } from '@prisma/client'

const tmpDir = path.join(process.cwd(), 'tmp')
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir)

describe.skip('E2E /api/stats/dashboard isolation', () => {
  let tmpDbPath: string
  let prismaTest: PrismaClient
  let authMock: any
  let orgAId: string
  let orgBId: string

  beforeAll(async () => {
    // Copy existing dev.db to a temp DB file to isolate test data
    const src = path.join(process.cwd(), 'prisma', 'dev.db')
    tmpDbPath = path.join(tmpDir, `testdb_${Date.now()}.db`)
    fs.copyFileSync(src, tmpDbPath)

    // Create a PrismaClient instance pointed at the tmp DB
    prismaTest = new PrismaClient({ datasources: { db: { url: `file:${tmpDbPath}` } } } as any)
    await prismaTest.$connect()

    // Create two organizations and related data
    const orgA = await prismaTest.organization.create({ data: { name: 'Org A' } })
    const orgB = await prismaTest.organization.create({ data: { name: 'Org B' } })
    orgAId = orgA.id
    orgBId = orgB.id

    const svcA = await prismaTest.service.create({ data: { name: 'SVC A', durationMinutes: 30, price: 42.5, organizationId: orgA.id } })
    const custA = await prismaTest.customer.create({ data: { firstName: 'Alice', lastName: 'A', phone: '000', organizationId: orgA.id } })
    const staffA = await prismaTest.staff.create({ data: { firstName: 'Staff', lastName: 'A', organizationId: orgA.id } })

    const start = new Date('2026-04-01T10:00:00Z')
    await prismaTest.appointment.create({ data: { startTime: start, endTime: new Date(start.getTime() + 30 * 60000), duration: 30, serviceId: svcA.id, customerId: custA.id, staffId: staffA.id, organizationId: orgA.id, price: 42.5, startDate: '2026-04-01' } })

    // Org B will have no appointments

    // Mock src/lib/prisma module to return this prismaTest instance for dashboard service
    vi.doMock('../../src/lib/prisma', () => ({ prisma: prismaTest }))

    // Prepare auth mock function to be set by tests
    authMock = vi.fn()
    vi.doMock('../../src/auth', () => ({ auth: () => authMock() }))
  })

  afterAll(async () => {
    try { await prismaTest.$disconnect() } catch (e) {}
    try { fs.unlinkSync(tmpDbPath) } catch (e) {}
  })

  it('Org A has revenue, Org B has zero', async () => {
    // import route dynamically after mocks
    // Import dashboardService dynamically and call it directly to get detailed error if any
    const { getDashboardForOrg } = await import('../../src/services/dashboard.service')
    const resDirect = await getDashboardForOrg(orgAId)
    expect(Number(resDirect.summary.totalRevenue)).toBeCloseTo(42.5)

    const resOther = await getDashboardForOrg(orgBId)
    expect(Number(resOther.summary.totalRevenue)).toBe(0)
  })
})




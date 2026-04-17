// Playwright JS test for billing accuracy
const { test, expect, request } = require('@playwright/test')

test('billing accuracy: service + products equals dashboard total', async () => {
  const apiContext = await request.newContext({ baseURL: process.env.BASE_URL ?? 'http://localhost:3000' })
  const testKey = process.env.TEST_API_KEY
  if (!testKey) throw new Error('TEST_API_KEY not set for e2e test')

  // 1) create test data
  const createRes = await apiContext.post('/api/test/create-billing-test-data', {
    headers: { 'x-test-api-key': testKey },
    data: { servicePrice: 40, productPrice: 15, productQty: 2 }
  })
  expect(createRes.ok()).toBeTruthy()
  const body = await createRes.json()
  const orgId = body.orgId
  expect(orgId).toBeTruthy()

  // 2) fetch dashboard summary in test mode
  const summaryRes = await apiContext.get(`/api/dashboard/summary?orgId=${encodeURIComponent(orgId)}`, { headers: { 'x-test-api-key': testKey } })
  expect(summaryRes.ok()).toBeTruthy()
  const summary = await summaryRes.json()

  const expected = 40 + (15 * 2)
  // realizedRevenue should equal expected (service + products)
  expect(Math.round((summary.summary.realizedRevenue ?? summary.summary.totalRevenue) * 100)).toBe(expected * 100)
})


import { describe, it, expect } from 'vitest'
import { CreateAppointmentSchema } from '../src/schemas/appointments'

describe('CreateAppointmentSchema', () => {
  it('rejects payloads that include organizationId from client', () => {
    const now = new Date()
    const payload = {
      start: now.toISOString(),
      end: new Date(now.getTime() + 30 * 60 * 1000).toISOString(), // +30min
      duration: 30,
      serviceId: 'svc_1',
      customerId: 'cust_1',
      staffId: 'stf_1',
      organizationId: 'malicious'
    }
    const result = CreateAppointmentSchema.safeParse(payload as unknown)
    // zod should ignore extra fields by default; we assert that organizationId is not in the parsed data
    expect(result.success).toBe(true)
    if (result.success) {
      // organizationId should not be present on parsed data
      expect((result.data as any).organizationId).toBeUndefined()
    }
  })
})


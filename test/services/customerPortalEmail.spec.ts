import { describe, expect, it } from 'vitest'
import { createAppointmentIcs } from '@/services/customerPortalEmail.service'

describe('createAppointmentIcs', () => {
  it('uses persisted UTC instants, the organization timezone and a stable event id', () => {
    const appointment = {
      id: 'appointment-123',
      startTime: new Date('2026-10-01T08:00:00.000Z'),
      endTime: new Date('2026-10-01T09:00:00.000Z'),
      createdAt: new Date('2026-09-30T12:00:00.000Z'),
      serviceName: 'Coupe; soin, finition',
      organizationName: 'Atelier',
      timezone: 'Europe/Paris',
      portalUrl: 'https://example.test/portail/atelier/reserver',
    }

    const first = createAppointmentIcs(appointment)
    const second = createAppointmentIcs(appointment)

    expect(first).toBe(second)
    expect(first).toContain('UID:appointment-123@customer-portal')
    expect(first).toContain('DTSTART:20261001T080000Z')
    expect(first).toContain('DTEND:20261001T090000Z')
    expect(first).toContain('X-WR-TIMEZONE:Europe/Paris')
    expect(first).toContain('SUMMARY:Coupe\\; soin\\, finition')
    expect(first).not.toContain('customerId')
  })
})

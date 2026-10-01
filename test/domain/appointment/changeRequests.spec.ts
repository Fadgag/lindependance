import { describe, expect, it } from 'vitest'
import {
  getAppointmentChangeEndTime,
  isAppointmentChangeApprovable,
  isAppointmentChangeRequestable,
  isAppointmentChangeStartValid,
} from '@/domain/appointment/changeRequests'

describe('getAppointmentChangeEndTime', () => {
  it('derives the requested end from the persisted service duration', () => {
    expect(getAppointmentChangeEndTime(
      new Date('2026-10-03T10:00:00.000Z'),
      45,
    )).toEqual(new Date('2026-10-03T10:45:00.000Z'))
  })
  it('rejects invalid starts and non-positive or non-integer service durations', () => {
    expect(() => getAppointmentChangeEndTime(new Date('invalid'), 30)).toThrow()
    expect(() => getAppointmentChangeEndTime(new Date(), 0)).toThrow()
    expect(() => getAppointmentChangeEndTime(new Date(), 30.5)).toThrow()
  })
})

describe('appointment change-request policies', () => {
  const now = new Date('2026-10-01T08:00:00.000Z')
  const startTime = new Date('2026-10-03T08:00:00.000Z')
  const requestedStart = new Date('2026-10-04T08:30:00.000Z')

  it('allows requests only for future, active appointments assigned to a practitioner', () => {
    expect(isAppointmentChangeRequestable({
      startTime,
      status: 'CONFIRMED',
      staffId: 'staff-1',
      now,
    })).toBe(true)
    expect(isAppointmentChangeRequestable({
      startTime,
      status: 'CANCELLED',
      staffId: 'staff-1',
      now,
    })).toBe(false)
    expect(isAppointmentChangeRequestable({
      startTime,
      status: 'CONFIRMED',
      staffId: null,
      now,
    })).toBe(false)
  })

  it('requires a distinct future start and only approves pending requests for active appointments', () => {
    expect(isAppointmentChangeStartValid({ appointmentStart: startTime, requestedStart, now })).toBe(true)
    expect(isAppointmentChangeStartValid({ appointmentStart: startTime, requestedStart: now, now })).toBe(false)
    expect(isAppointmentChangeStartValid({ appointmentStart: startTime, requestedStart: startTime, now })).toBe(false)
    expect(isAppointmentChangeApprovable({
      requestStatus: 'PENDING',
      appointmentStatus: 'CONFIRMED',
      staffId: 'staff-1',
      requestedStart,
      now,
    })).toBe(true)
    expect(isAppointmentChangeApprovable({
      requestStatus: 'PENDING',
      appointmentStatus: 'CANCELLED',
      staffId: 'staff-1',
      requestedStart,
      now,
    })).toBe(false)
  })
})

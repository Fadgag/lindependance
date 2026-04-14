import { describe, it, expect, vi, afterEach } from 'vitest'
import { formatForDateTimeLocal, getDefaultStart } from '@/lib/dateUtils'

afterEach(() => vi.restoreAllMocks())

describe('formatForDateTimeLocal', () => {
  it('formats a date correctly in local YYYY-MM-DDTHH:MM', () => {
    const d = new Date(2026, 3, 14, 9, 5) // April 14 2026 09:05 local
    expect(formatForDateTimeLocal(d)).toBe('2026-04-14T09:05')
  })

  it('zero-pads single-digit months, days, hours, minutes', () => {
    const d = new Date(2026, 0, 5, 8, 3) // January 5 2026 08:03
    expect(formatForDateTimeLocal(d)).toBe('2026-01-05T08:03')
  })
})

describe('getDefaultStart', () => {
  it('rounds up to next 30-min slot within business hours', () => {
    const fakeNow = new Date(2026, 3, 14, 14, 15) // 14:15 -> should give 14:30
    vi.setSystemTime(fakeNow)
    expect(getDefaultStart()).toBe('2026-04-14T14:30')
  })

  it('rounds up correctly when already on the slot boundary', () => {
    const fakeNow = new Date(2026, 3, 14, 14, 0) // 14:00 -> next slot is 14:00 (ceil of exact multiple)
    vi.setSystemTime(fakeNow)
    expect(getDefaultStart()).toBe('2026-04-14T14:00')
  })

  it('rounds up to next hour when at :40', () => {
    const fakeNow = new Date(2026, 3, 14, 14, 40) // 14:40 -> 15:00
    vi.setSystemTime(fakeNow)
    expect(getDefaultStart()).toBe('2026-04-14T15:00')
  })

  it('clamps to 08:00 when before business hours', () => {
    const fakeNow = new Date(2026, 3, 14, 6, 0) // 06:00
    vi.setSystemTime(fakeNow)
    expect(getDefaultStart()).toBe('2026-04-14T08:00')
  })

  it('proposes next day at 08:00 when past 18:00', () => {
    const fakeNow = new Date(2026, 3, 14, 18, 10) // 18:10
    vi.setSystemTime(fakeNow)
    expect(getDefaultStart()).toBe('2026-04-15T08:00')
  })

  it('proposes next day at 08:00 at exactly 18:00 when ms > 0', () => {
    const fakeNow = new Date(2026, 3, 14, 18, 1) // 18:01 -> next slot 18:30 > 18:00 -> next day
    vi.setSystemTime(fakeNow)
    expect(getDefaultStart()).toBe('2026-04-15T08:00')
  })

  it('accepts 17:30 as-is (already on a slot boundary)', () => {
    const fakeNow = new Date(2026, 3, 14, 17, 30) // 17:30 is a slot boundary, returned as-is
    vi.setSystemTime(fakeNow)
    expect(getDefaultStart()).toBe('2026-04-14T17:30')
  })
})



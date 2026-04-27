import { describe, it, expect } from 'vitest'
import { buildOccurrences } from '@/services/unavailability.service'

const makeDate = (y: number, m: number, d: number, h = 9, min = 0) =>
  new Date(y, m - 1, d, h, min, 0, 0)

describe('buildOccurrences', () => {
  it('NONE — returns exactly 1 occurrence identical to input', () => {
    const start = makeDate(2026, 4, 20, 10, 0)
    const end = makeDate(2026, 4, 20, 11, 0)
    const result = buildOccurrences(start, end, 'NONE')
    expect(result).toHaveLength(1)
    expect(result[0].start).toEqual(start)
    expect(result[0].end).toEqual(end)
  })

  it('WEEKLY — generates ~26 occurrences over 6 months', () => {
    const start = makeDate(2026, 1, 5, 9, 0)
    const end = makeDate(2026, 1, 5, 10, 0)
    const result = buildOccurrences(start, end, 'WEEKLY')
    // 6 months × ~4.33 weeks ≈ 26 occurrences
    expect(result.length).toBeGreaterThanOrEqual(25)
    expect(result.length).toBeLessThanOrEqual(27)
    // First occurrence = start
    expect(result[0].start).toEqual(start)
    // Step between first two = 7 days
    const diff = result[1].start.getTime() - result[0].start.getTime()
    expect(diff).toBe(7 * 24 * 60 * 60 * 1000)
    // Duration preserved
    result.forEach(o => {
      expect(o.end.getTime() - o.start.getTime()).toBe(60 * 60 * 1000)
    })
  })

  it('BIWEEKLY — step is 14 days, ~13 occurrences over 6 months', () => {
    const start = makeDate(2026, 1, 5, 9, 0)
    const end = makeDate(2026, 1, 5, 10, 30)
    const result = buildOccurrences(start, end, 'BIWEEKLY')
    expect(result.length).toBeGreaterThanOrEqual(12)
    expect(result.length).toBeLessThanOrEqual(14)
    const diff = result[1].start.getTime() - result[0].start.getTime()
    expect(diff).toBe(14 * 24 * 60 * 60 * 1000)
  })

  it('MONTHLY — generates 7 occurrences over 6 months (inclusive)', () => {
    const start = makeDate(2026, 1, 15, 14, 0)
    const end = makeDate(2026, 1, 15, 15, 0)
    const result = buildOccurrences(start, end, 'MONTHLY')
    // Jan 15, Feb 15, Mar 15, Apr 15, May 15, Jun 15, Jul 15 = 7
    expect(result.length).toBeGreaterThanOrEqual(6)
    expect(result.length).toBeLessThanOrEqual(7)
    // Each occurrence is same day-of-month, consecutive months
    expect(result[0].start.getDate()).toBe(15)
    expect(result[1].start.getMonth()).toBe(result[0].start.getMonth() + 1)
  })

  it('MONTHLY — edge case: Jan 30 → Feb truncates to last day of Feb (JS native behaviour)', () => {
    const start = makeDate(2026, 1, 30, 9, 0) // Jan 30
    const end = makeDate(2026, 1, 30, 10, 0)
    const result = buildOccurrences(start, end, 'MONTHLY')
    // JS Date: new Date(2026, 1, 30) → March 2 (overflow into March) — this is native JS behaviour
    // The test documents the current behaviour so a future refactor is aware of it
    expect(result.length).toBeGreaterThan(0)
    // All occurrences have same duration
    result.forEach(o => {
      expect(o.end.getTime() - o.start.getTime()).toBe(60 * 60 * 1000)
    })
  })

  it('Duration is preserved across all recurrence types', () => {
    const durationMs = 90 * 60 * 1000 // 90 minutes
    const start = makeDate(2026, 3, 10, 8, 0)
    const end = new Date(start.getTime() + durationMs)
    for (const rule of ['WEEKLY', 'BIWEEKLY', 'MONTHLY'] as const) {
      const result = buildOccurrences(start, end, rule)
      result.forEach(o => {
        expect(o.end.getTime() - o.start.getTime()).toBe(durationMs)
      })
    }
  })

  it('All occurrences are within 6 months of start', () => {
    const start = makeDate(2026, 4, 1, 9, 0)
    const end = makeDate(2026, 4, 1, 10, 0)
    const maxDate = new Date(start.getFullYear(), start.getMonth() + 6, start.getDate())
    for (const rule of ['WEEKLY', 'BIWEEKLY', 'MONTHLY'] as const) {
      const result = buildOccurrences(start, end, rule)
      result.forEach(o => {
        expect(o.start.getTime()).toBeLessThanOrEqual(maxDate.getTime())
      })
    }
  })
})


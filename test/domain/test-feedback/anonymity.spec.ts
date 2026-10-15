import { describe, expect, it } from 'vitest'
import { toFeedbackCalendarDay } from '@/domain/test-feedback/anonymity'

describe('toFeedbackCalendarDay', () => {
  it('keeps the calendar day while removing the exact time', () => {
    expect(toFeedbackCalendarDay(new Date('2026-10-04T09:30:45.123Z'))).toBe('2026-10-04')
  })

  it('uses the UTC calendar day consistently', () => {
    expect(toFeedbackCalendarDay(new Date('2026-10-04T23:30:00-02:00'))).toBe('2026-10-05')
  })
})

import { describe, expect, it } from 'vitest'
import {
  isIssueReportExpired,
  sanitizeIssueDiagnostics,
} from '@/domain/issue-reporting/issueReporting'

describe('sanitizeIssueDiagnostics', () => {
  it('keeps only the route and redacts personal or secret values from recent errors', () => {
    expect(sanitizeIssueDiagnostics({
      pathname: '/agenda?customer=private#details',
      errors: [
        {
          name: 'TypeError',
          message: 'Request failed for camille@example.test with Bearer abc.def.ghi at https://example.test/?token=secret',
        },
      ],
    })).toEqual({
      pathname: '/agenda',
      errors: [{
        name: 'TypeError',
        message: expect.not.stringContaining('camille@example.test'),
      }],
    })

    const diagnostics = sanitizeIssueDiagnostics({
      pathname: '/agenda',
      errors: [{ name: 'TypeError', message: 'Request failed for camille@example.test with Bearer abc.def.ghi at https://example.test/?token=secret' }],
    })
    expect(diagnostics.errors[0]?.message).not.toContain('abc.def.ghi')
    expect(diagnostics.errors[0]?.message).not.toContain('https://example.test')
    expect(diagnostics.errors[0]?.message).not.toContain('secret')
  })

  it('bounds the number and length of captured errors', () => {
    const diagnostics = sanitizeIssueDiagnostics({
      pathname: '/agenda',
      errors: Array.from({ length: 8 }, (_, index) => ({
        name: `Error${index}`,
        message: 'x'.repeat(900),
      })),
    })

    expect(diagnostics.errors).toHaveLength(5)
    expect(diagnostics.errors[0]?.message).toHaveLength(500)
  })
})

describe('isIssueReportExpired', () => {
  it('expires resolved reports after 90 days, but not open reports', () => {
    const now = new Date('2026-10-06T12:00:00.000Z')
    expect(isIssueReportExpired(new Date('2026-07-08T12:00:00.000Z'), now)).toBe(true)
    expect(isIssueReportExpired(new Date('2026-07-09T12:00:00.000Z'), now)).toBe(false)
    expect(isIssueReportExpired(null, now)).toBe(false)
  })
})

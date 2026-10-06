import { describe, expect, it } from 'vitest'
import {
  IssueReportStatusSchema,
  IssueReportSubmissionSchema,
} from '@/schemas/issueReport'

describe('issue report schemas', () => {
  it('accepts a bounded report with a route and client errors', () => {
    expect(IssueReportSubmissionSchema.safeParse({
      title: 'La page se bloque',
      description: 'La page ne répond plus après la validation.',
      steps: 'Ouvrir le portail puis valider le rendez-vous.',
      pathname: '/portail/osez-le-tre/mes-rdv',
      errors: [{ name: 'TypeError', message: 'Erreur de rendu' }],
    }).success).toBe(true)
  })

  it('rejects empty or oversized text and routes that contain query parameters', () => {
    expect(IssueReportSubmissionSchema.safeParse({
      title: ' ',
      description: 'Problème',
      steps: '',
      pathname: '/agenda?customerId=private',
      errors: [],
    }).success).toBe(false)
    expect(IssueReportSubmissionSchema.safeParse({
      title: 'x'.repeat(121),
      description: 'Problème',
      steps: '',
      pathname: '/agenda',
      errors: [],
    }).success).toBe(false)
  })

  it('only permits the supported triage states', () => {
    expect(IssueReportStatusSchema.safeParse('IN_PROGRESS').success).toBe(true)
    expect(IssueReportStatusSchema.safeParse('CLOSED').success).toBe(false)
  })
})

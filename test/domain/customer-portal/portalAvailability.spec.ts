import { describe, expect, it } from 'vitest'
import { getPortalActivationIssue } from '@/domain/customer-portal/portalAvailability'

describe('getPortalActivationIssue', () => {
  it('requires an active practitioner before considering contact details', () => {
    expect(getPortalActivationIssue({
      activePractitionerCount: 0,
      portalContactPhone: '+33123456789',
      portalContactEmail: 'contact@example.com',
    })).toBe('practitioner_required')
  })

  it('requires at least one public contact method', () => {
    expect(getPortalActivationIssue({
      activePractitionerCount: 1,
      portalContactPhone: null,
      portalContactEmail: null,
    })).toBe('contact_required')
  })

  it('allows activation when an active practitioner and a public contact exist', () => {
    expect(getPortalActivationIssue({
      activePractitionerCount: 1,
      portalContactPhone: null,
      portalContactEmail: 'contact@example.com',
    })).toBeNull()
  })
})

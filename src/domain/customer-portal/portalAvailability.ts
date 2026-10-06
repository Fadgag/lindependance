export type PortalActivationIssue = 'practitioner_required' | 'contact_required'

export function getPortalActivationIssue(input: {
  activePractitionerCount: number
  portalContactPhone: string | null
  portalContactEmail: string | null
}): PortalActivationIssue | null {
  if (input.activePractitionerCount < 1) return 'practitioner_required'
  if (!input.portalContactPhone && !input.portalContactEmail) return 'contact_required'
  return null
}

export type OrganizationAccountRole = 'USER' | 'ADMIN'

export type OrganizationAccountMutationDecision =
  | 'allowed'
  | 'self'
  | 'privileged_account'
  | 'last_admin'

export function canCreateInitialOrganizationAdmin(existingAdminCount: number): boolean {
  return existingAdminCount === 0
}

export function assessOrganizationAccountMutation(input: {
  actorId: string
  targetId: string
  targetRole: string
  organizationAdminCount: number
  nextRole?: OrganizationAccountRole
}): OrganizationAccountMutationDecision {
  if (input.actorId === input.targetId) return 'self'
  if (input.targetRole !== 'USER' && input.targetRole !== 'ADMIN') return 'privileged_account'
  if (
    input.targetRole === 'ADMIN'
    && input.organizationAdminCount <= 1
    && input.nextRole !== 'ADMIN'
  ) {
    return 'last_admin'
  }
  return 'allowed'
}

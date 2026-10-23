import { describe, expect, it } from 'vitest'
import {
  assessOrganizationAccountMutation,
  canCreateInitialOrganizationAdmin,
} from '@/domain/user-accounts/management'

describe('organization account management policy', () => {
  it('allows only the first organization ADMIN through technical provisioning', () => {
    expect(canCreateInitialOrganizationAdmin(0)).toBe(true)
    expect(canCreateInitialOrganizationAdmin(1)).toBe(false)
  })

  it('prevents an admin from managing their own account', () => {
    expect(assessOrganizationAccountMutation({
      actorId: 'admin-1',
      targetId: 'admin-1',
      targetRole: 'ADMIN',
      organizationAdminCount: 2,
      nextRole: 'USER',
    })).toBe('self')
  })

  it('protects privileged accounts and the last organization admin', () => {
    expect(assessOrganizationAccountMutation({
      actorId: 'admin-1',
      targetId: 'technical-admin',
      targetRole: 'TECH_ADMIN',
      organizationAdminCount: 2,
    })).toBe('privileged_account')
    expect(assessOrganizationAccountMutation({
      actorId: 'admin-1',
      targetId: 'admin-2',
      targetRole: 'ADMIN',
      organizationAdminCount: 1,
      nextRole: 'USER',
    })).toBe('last_admin')
    expect(assessOrganizationAccountMutation({
      actorId: 'admin-1',
      targetId: 'admin-2',
      targetRole: 'ADMIN',
      organizationAdminCount: 1,
    })).toBe('last_admin')
  })

  it('allows managing other USER and ADMIN accounts without granting technical access', () => {
    expect(assessOrganizationAccountMutation({
      actorId: 'admin-1',
      targetId: 'user-1',
      targetRole: 'USER',
      organizationAdminCount: 1,
      nextRole: 'ADMIN',
    })).toBe('allowed')
    expect(assessOrganizationAccountMutation({
      actorId: 'admin-1',
      targetId: 'user-1',
      targetRole: 'USER',
      organizationAdminCount: 1,
    })).toBe('allowed')
  })
})

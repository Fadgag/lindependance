import { describe, expect, it } from 'vitest'
import { canProvisionTestSalon } from '@/domain/tech-admin/testSalonProvisioning'
import { CreateTestSalonSchema } from '@/schemas/techAdmin'

describe('test salon provisioning environment', () => {
  it('allows creation only on a Vercel preview deployment of the preprod branch', () => {
    expect(canProvisionTestSalon({
      vercelEnvironment: 'preview',
      gitCommitRef: 'preprod',
    })).toBe(true)

    expect(canProvisionTestSalon({
      vercelEnvironment: 'production',
      gitCommitRef: 'preprod',
    })).toBe(false)
    expect(canProvisionTestSalon({
      vercelEnvironment: 'preview',
      gitCommitRef: 'main',
    })).toBe(false)
    expect(canProvisionTestSalon({
      vercelEnvironment: 'development',
      gitCommitRef: 'preprod',
    })).toBe(false)
  })
})

describe('test salon provisioning input', () => {
  it('normalizes a controlled email and defaults the staff role to USER', () => {
    expect(CreateTestSalonSchema.parse({
      email: '  Staff+Test@Example.com ',
      confirmControlledEmail: true,
    })).toEqual({
      email: 'staff+test@example.com',
      role: 'USER',
      confirmControlledEmail: true,
    })
  })

  it('allows ADMIN only as an explicit normal staff role', () => {
    expect(CreateTestSalonSchema.parse({
      email: 'staff@example.com',
      role: 'ADMIN',
      confirmControlledEmail: true,
    }).role).toBe('ADMIN')

    expect(CreateTestSalonSchema.safeParse({
      email: 'staff@example.com',
      role: 'TECH_ADMIN',
      confirmControlledEmail: true,
    }).success).toBe(false)
  })

  it('requires confirmation and rejects caller-selected organization fields', () => {
    expect(CreateTestSalonSchema.safeParse({
      email: 'staff@example.com',
    }).success).toBe(false)

    expect(CreateTestSalonSchema.safeParse({
      email: 'staff@example.com',
      confirmControlledEmail: true,
      organizationId: 'other-organization',
    }).success).toBe(false)
  })
})

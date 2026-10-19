import { describe, expect, it } from 'vitest'
import { canProvisionTestSalon } from '@/domain/tech-admin/testSalonProvisioning'

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

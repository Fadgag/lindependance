import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import TestSalonsPage from '@/app/test-salons/page'

const mocks = vi.hoisted(() => ({
  getAccess: vi.fn(),
}))

vi.mock('@/lib/testCampaignAccess', () => ({
  getTestCampaignAdminAccess: mocks.getAccess,
}))
vi.mock('@/components/test-admin/InitialOrganizationAdminCard', () => ({
  default: () => null,
}))
vi.mock('@/components/test-admin/TestSalonProvisioningCard', () => ({
  default: () => null,
}))

import { getTestCampaignAdminAccess } from '@/lib/testCampaignAccess'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('TestSalonsPage', () => {
  it('uses the defined studio color utilities', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview')
    vi.stubEnv('VERCEL_GIT_COMMIT_REF', 'preprod')
    vi.mocked(getTestCampaignAdminAccess).mockResolvedValue({
      authorized: true,
      session: {
        expires: '2026-10-23T12:00:00.000Z',
        user: {
          id: 'technical-admin',
          name: 'Technical Admin',
          email: 'admin@example.test',
          image: null,
          role: 'TECH_ADMIN',
          accountType: 'STAFF',
        },
      },
    })

    render(await TestSalonsPage())

    expect(screen.getByRole('main')).toHaveClass('bg-studio-bg')
    expect(screen.getByText('Administration technique')).toHaveClass('text-studio-primary')
    expect(screen.getByRole('heading', { name: 'Salons de test' })).toHaveClass('text-studio-text')
    expect(screen.getByText(/Préparez un environnement fictif/)).toHaveClass('text-studio-muted')
  })
})

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { hasTechAdminAccess } from '@/domain/test-feedback/access'
import {
  getCampaignSubmissionAvailability,
  getScenarioProgress,
  parseScenarioGuide,
  resolveFeedbackScenarios,
  type FeedbackResult,
} from '@/domain/test-feedback/scenarios'

describe('parseScenarioGuide', () => {
  it('parses scenario details from the quality guides', () => {
    const guide = [
      '#### [ ] ADM-01 — Accès staff',
      '**Priorité : P0 · Exigence :** requirement',
      '',
      '**Étapes :** se connecter avec un compte.',
      '',
      '**Attendu :** l’accès est limité.',
      '',
      '**Automatisé :** tests.',
      '',
      '#### [ ] ADM-02 — File de revue',
      '**Priorité : P1 · Exigence :** requirement',
      '**Étapes :** ouvrir la file.',
      '**Attendu :** seules les demandes attendues apparaissent.',
    ].join('\n')

    expect(parseScenarioGuide(guide, 'ADMIN')).toEqual([
      {
        id: 'ADM-01',
        profile: 'ADMIN',
        title: 'Accès staff',
        priority: 'P0',
        steps: 'se connecter avec un compte.',
        expected: 'l’accès est limité.',
      },
      {
        id: 'ADM-02',
        profile: 'ADMIN',
        title: 'File de revue',
        priority: 'P1',
        steps: 'ouvrir la file.',
        expected: 'seules les demandes attendues apparaissent.',
      },
    ])
  })

  it('stays synchronized with every scenario in the repository guides', () => {
    const adminGuide = readFileSync(join(process.cwd(), 'quality/recette-beta-admin.md'), 'utf8')
    const userGuide = readFileSync(join(process.cwd(), 'quality/recette-beta-customer.md'), 'utf8')

    expect(parseScenarioGuide(adminGuide, 'ADMIN')).toHaveLength(12)
    expect(parseScenarioGuide(userGuide, 'USER')).toHaveLength(17)
  })
})

describe('getScenarioProgress', () => {
  it('counts only the latest result for each profile and scenario', () => {
    const feedback: FeedbackResult[] = [
      { profile: 'USER', scenarioId: 'CUS-01', status: 'PASS', createdAt: new Date('2026-10-01T10:00:00Z') },
      { profile: 'USER', scenarioId: 'CUS-01', status: 'FAIL', createdAt: new Date('2026-10-01T10:05:00Z') },
      { profile: 'ADMIN', scenarioId: 'ADM-01', status: 'BLOCKED', createdAt: new Date('2026-10-01T10:02:00Z') },
    ]

    expect(getScenarioProgress(['ADMIN', 'USER'], { ADMIN: 12, USER: 17 }, feedback)).toEqual({
      total: 29,
      tested: 2,
      passed: 0,
      failed: 1,
      blocked: 1,
      remaining: 27,
      currentResults: [
        { profile: 'ADMIN', scenarioId: 'ADM-01', status: 'BLOCKED', createdAt: new Date('2026-10-01T10:02:00Z') },
        { profile: 'USER', scenarioId: 'CUS-01', status: 'FAIL', createdAt: new Date('2026-10-01T10:05:00Z') },
      ],
    })

  })
})

describe('hasTechAdminAccess', () => {
  it('requires the provisioned technical staff role', () => {
    expect(hasTechAdminAccess({ user: { role: 'TECH_ADMIN', accountType: 'STAFF' } })).toBe(true)
    expect(hasTechAdminAccess({ user: { role: 'ADMIN', accountType: 'STAFF' } })).toBe(false)
    expect(hasTechAdminAccess({ user: { role: 'TECH_ADMIN', accountType: 'CUSTOMER' } })).toBe(false)
    expect(hasTechAdminAccess(null)).toBe(false)
  })

  describe('getCampaignSubmissionAvailability', () => {
    it('accepts only an active campaign and an enabled profile', () => {
      expect(getCampaignSubmissionAvailability({
        campaignStatus: 'ACTIVE',
        enabledProfiles: ['USER'],
        submittedProfile: 'USER',
      })).toBe('available')
      expect(getCampaignSubmissionAvailability({
        campaignStatus: 'CLOSED',
        enabledProfiles: ['USER'],
        submittedProfile: 'USER',
      })).toBe('closed')
      expect(getCampaignSubmissionAvailability({
        campaignStatus: 'ACTIVE',
        enabledProfiles: ['ADMIN'],
        submittedProfile: 'USER',
      })).toBe('profile_not_enabled')
    })
  })

  describe('resolveFeedbackScenarios', () => {
    it('uses scenario details from the trusted guide and rejects unknown IDs', () => {
      const scenarios = parseScenarioGuide([
        '#### [ ] CUS-01 — Réserver',
        '**Priorité : P1 · Exigence :** test',
        '**Étapes :** choisir une prestation.',
        '**Attendu :** la réservation est enregistrée.',
      ].join('\n'), 'USER')
      const resolved = resolveFeedbackScenarios(scenarios, [{
        scenarioId: 'CUS-01',
        status: 'FAIL',
        comment: 'Le formulaire bloque.',
      }])

      expect(resolved).toEqual([{
        scenarioId: 'CUS-01',
        scenarioTitle: 'Réserver',
        scenarioPriority: 'P1',
        status: 'FAIL',
        comment: 'Le formulaire bloque.',
      }])
      expect(resolveFeedbackScenarios(scenarios, [{
        scenarioId: 'CUS-99',
        status: 'PASS',
      }])).toBeNull()
    })
  })
})

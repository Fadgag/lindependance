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
import {
  filterScenariosByGroups,
  isValidTestCampaignScope,
  testScenarioGroups,
} from '@/domain/test-feedback/scenarioGroups'

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

    expect(parseScenarioGuide(adminGuide, 'ADMIN')).toHaveLength(19)
    expect(parseScenarioGuide(userGuide, 'USER')).toHaveLength(16)
    expect(parseScenarioGuide(adminGuide, 'ADMIN').map(({ id }) => id)).toContain('ADM-13')
    expect(parseScenarioGuide(adminGuide, 'ADMIN').map(({ id }) => id)).toContain('ADM-14')
    expect(parseScenarioGuide(adminGuide, 'ADMIN').map(({ id }) => id)).toContain('ADM-15')
    expect(parseScenarioGuide(adminGuide, 'ADMIN').map(({ id }) => id)).toContain('ADM-16')
    expect(parseScenarioGuide(adminGuide, 'ADMIN').map(({ id }) => id)).toContain('ADM-17')
    expect(parseScenarioGuide(adminGuide, 'ADMIN').map(({ id }) => id)).toContain('ADM-18')
    expect(parseScenarioGuide(adminGuide, 'ADMIN').map(({ id }) => id)).toContain('ADM-19')
  })
})

describe('test scenario groups', () => {
  it('defines selectable end-to-end groups that map to the expected guide ranges', () => {
    const userScenarios = parseScenarioGuide(
      readFileSync(join(process.cwd(), 'quality/recette-beta-customer.md'), 'utf8'),
      'USER',
    )
    const adminScenarios = parseScenarioGuide(
      readFileSync(join(process.cwd(), 'quality/recette-beta-admin.md'), 'utf8'),
      'ADMIN',
    )

    expect(testScenarioGroups.map(({ id }) => id)).toEqual([
      'ONLINE_BOOKING',
      'APPOINTMENTS_AND_CHANGES',
      'SECURITY_AND_MOBILE',
      'STAFF_ADMINISTRATION',
    ])
    expect(testScenarioGroups.find(({ id }) => id === 'STAFF_ADMINISTRATION')?.range)
      .toBe('ADM-01 à ADM-19')
    expect(filterScenariosByGroups(userScenarios, ['ONLINE_BOOKING']).map(({ id }) => id)).toEqual(
      userScenarios
        .filter(({ id }) => Number(id.slice(-2)) <= 10)
        .map(({ id }) => id),
    )
    expect(filterScenariosByGroups(adminScenarios, ['STAFF_ADMINISTRATION'])).toEqual(adminScenarios)
  })

  it('requires every enabled profile to have selected scenarios and rejects unrelated groups', () => {
    expect(isValidTestCampaignScope(['USER'], ['ONLINE_BOOKING'])).toBe(true)
    expect(isValidTestCampaignScope(['ADMIN', 'USER'], ['ONLINE_BOOKING', 'STAFF_ADMINISTRATION'])).toBe(true)
    expect(isValidTestCampaignScope(['ADMIN', 'USER'], ['ONLINE_BOOKING'])).toBe(false)
    expect(isValidTestCampaignScope(['ADMIN'], ['ONLINE_BOOKING'])).toBe(false)
    expect(isValidTestCampaignScope(['USER'], [])).toBe(false)
  })

  it('assigns every guide scenario to exactly one selectable group', () => {
    const profiles: Array<'ADMIN' | 'USER'> = ['ADMIN', 'USER']
    const scenarios = profiles.flatMap((profile) => parseScenarioGuide(
      readFileSync(join(
        process.cwd(),
        profile === 'ADMIN' ? 'quality/recette-beta-admin.md' : 'quality/recette-beta-customer.md',
      ), 'utf8'),
      profile,
    ))
    const groupedScenarios = testScenarioGroups.flatMap((group) => (
      filterScenariosByGroups(scenarios.filter(({ profile }) => profile === group.profile), [group.id])
    ))

    expect(groupedScenarios).toHaveLength(scenarios.length)
    expect(new Set(groupedScenarios.map(({ id }) => id)).size).toBe(scenarios.length)
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

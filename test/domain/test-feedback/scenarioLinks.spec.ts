import { describe, expect, it } from 'vitest'
import { getTestScenarioLinks } from '@/domain/test-feedback/scenarioLinks'

describe('test scenario links', () => {
  it('links customer booking scenarios to the selected organization portal', () => {
    expect(getTestScenarioLinks('USER', 'CUS-01', 'osez-le-tre', true)).toEqual([
      { href: '/portail/osez-le-tre/reserver', label: 'Ouvrir le portail de réservation' },
    ])
  })

  it('links customer appointment scenarios to the appointment list', () => {
    expect(getTestScenarioLinks('USER', 'CUS-11', 'osez-le-tre', true)).toEqual([
      { href: '/portail/osez-le-tre/mes-rdv', label: 'Ouvrir Mes rendez-vous' },
    ])
  })

  it('links timezone and public-agenda scenarios to their relevant portal screens', () => {
    expect(getTestScenarioLinks('USER', 'CUS-03', 'osez-le-tre', true)).toEqual([
      { href: '/portail/osez-le-tre/reserver', label: 'Ouvrir le portail de réservation' },
      { href: '/portail/osez-le-tre/mes-rdv', label: 'Ouvrir Mes rendez-vous' },
    ])
    expect(getTestScenarioLinks('USER', 'CUS-04', 'osez-le-tre', true)).toEqual([
      { href: '/portail/osez-le-tre/agenda', label: 'Ouvrir l’agenda public' },
    ])
  })

  it('provides both customer and staff-protection links for the security scenario', () => {
    expect(getTestScenarioLinks('USER', 'CUS-16', 'osez-le-tre', false)).toEqual([
      { href: '/agenda', label: 'Vérifier l’accès refusé à l’agenda staff' },
    ])
  })

  it('does not invent a customer portal link when the organization has no slug', () => {
    expect(getTestScenarioLinks('USER', 'CUS-01', null, true)).toEqual([])
    expect(getTestScenarioLinks('USER', 'CUS-01', 'osez-le-tre', false)).toEqual([])
  })

  it('links staff scenarios to the relevant back-office page', () => {
    expect(getTestScenarioLinks('ADMIN', 'ADM-07', 'osez-le-tre', false)).toEqual([
      { href: '/agenda', label: 'Ouvrir l’agenda staff' },
    ])
    expect(getTestScenarioLinks('ADMIN', 'ADM-03', 'osez-le-tre', false)).toEqual([
      { href: '/change-requests', label: 'Ouvrir les demandes de changement' },
    ])
  })
})

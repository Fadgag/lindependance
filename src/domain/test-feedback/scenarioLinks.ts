import type { TestProfile } from './scenarios'

export interface TestScenarioLink {
  href: string
  label: string
}

const bookingLink = (slug: string): TestScenarioLink => ({
  href: `/portail/${encodeURIComponent(slug)}/reserver`,
  label: 'Ouvrir le portail de réservation',
})

const appointmentsLink = (slug: string): TestScenarioLink => ({
  href: `/portail/${encodeURIComponent(slug)}/mes-rdv`,
  label: 'Ouvrir Mes rendez-vous',
})

export function getTestScenarioLinks(
  profile: TestProfile,
  scenarioId: string,
  organizationSlug: string | null,
  portalEnabled: boolean,
): TestScenarioLink[] {
  if (profile === 'ADMIN') {
    const number = Number(scenarioId.match(/^ADM-(\d{2})$/)?.[1])
    if (!Number.isInteger(number)) return []
    if ((number >= 1 && number <= 6) || (number >= 11 && number <= 12)) {
      return [{ href: '/change-requests', label: 'Ouvrir les demandes de changement' }]
    }
    if (number >= 7 && number <= 10) {
      return [{ href: '/agenda', label: 'Ouvrir l’agenda staff' }]
    }
    return []
  }

  if (scenarioId === 'CUS-16') {
    return [{ href: '/agenda', label: 'Vérifier l’accès refusé à l’agenda staff' }]
  }
  if (!portalEnabled || !organizationSlug) return []

  const number = Number(scenarioId.match(/^CUS-(\d{2})$/)?.[1])
  if (number === 4) return []
  if (number === 3) return [bookingLink(organizationSlug), appointmentsLink(organizationSlug)]
  if (number >= 1 && number <= 10) return [bookingLink(organizationSlug)]
  if (number >= 11 && number <= 15) return [appointmentsLink(organizationSlug)]
  if (number === 17) return [bookingLink(organizationSlug), appointmentsLink(organizationSlug)]
  return []
}

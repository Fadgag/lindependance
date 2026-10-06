import { z } from 'zod'
import type { TestProfile, TestScenario } from './scenarios'

export const TestScenarioGroupSchema = z.enum([
  'ONLINE_BOOKING',
  'APPOINTMENTS_AND_CHANGES',
  'SECURITY_AND_MOBILE',
  'STAFF_ADMINISTRATION',
])

export type TestScenarioGroupId = z.infer<typeof TestScenarioGroupSchema>

export const testScenarioGroups: ReadonlyArray<{
  id: TestScenarioGroupId
  label: string
  range: string
  profile: TestProfile
  firstScenario: number
  lastScenario: number
}> = [
  {
    id: 'ONLINE_BOOKING',
    label: 'Réservation en ligne',
    range: 'CUS-01 à CUS-10',
    profile: 'USER',
    firstScenario: 1,
    lastScenario: 10,
  },
  {
    id: 'APPOINTMENTS_AND_CHANGES',
    label: 'Mes rendez-vous et changements',
    range: 'CUS-11 à CUS-15',
    profile: 'USER',
    firstScenario: 11,
    lastScenario: 15,
  },
  {
    id: 'SECURITY_AND_MOBILE',
    label: 'Sécurité et mobile',
    range: 'CUS-16 à CUS-17',
    profile: 'USER',
    firstScenario: 16,
    lastScenario: 17,
  },
  {
    id: 'STAFF_ADMINISTRATION',
    label: 'Administration staff',
    range: 'ADM-01 à ADM-13',
    profile: 'ADMIN',
    firstScenario: 1,
    lastScenario: 13,
  },
]

function getGroupForScenario(profile: TestProfile, scenarioId: string) {
  const match = scenarioId.match(/^(ADM|CUS)-(\d{2})$/)
  if (!match) return undefined
  const scenarioProfile = match[1] === 'ADM' ? 'ADMIN' : 'USER'
  if (scenarioProfile !== profile) return undefined

  const scenarioNumber = Number(match[2])
  return testScenarioGroups.find((group) => (
    group.profile === profile
    && scenarioNumber >= group.firstScenario
    && scenarioNumber <= group.lastScenario
  ))
}

export function filterScenariosByGroups(
  scenarios: TestScenario[],
  selectedGroups: TestScenarioGroupId[],
): TestScenario[] {
  return scenarios.filter((scenario) => {
    const group = getGroupForScenario(scenario.profile, scenario.id)
    return group !== undefined && selectedGroups.includes(group.id)
  })
}

export function getDefaultScenarioGroupsForProfiles(
  profiles: TestProfile[],
): TestScenarioGroupId[] {
  return testScenarioGroups
    .filter((group) => profiles.includes(group.profile))
    .map(({ id }) => id)
}

export function isScenarioInGroups(
  profile: TestProfile,
  scenarioId: string,
  selectedGroups: TestScenarioGroupId[],
): boolean {
  const group = getGroupForScenario(profile, scenarioId)
  return group !== undefined && selectedGroups.includes(group.id)
}

export function isValidTestCampaignScope(
  profiles: TestProfile[],
  selectedGroups: TestScenarioGroupId[],
): boolean {
  if (profiles.length === 0 || selectedGroups.length === 0) return false

  const selectedProfileSet = new Set(profiles)
  const groupProfiles = selectedGroups.map(
    (id) => testScenarioGroups.find((group) => group.id === id)?.profile,
  )

  return groupProfiles.every((profile) => profile !== undefined && selectedProfileSet.has(profile))
    && profiles.every((profile) => groupProfiles.includes(profile))
}

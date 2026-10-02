export type TestProfile = 'ADMIN' | 'USER'
export type FeedbackStatus = 'PASS' | 'FAIL' | 'BLOCKED'

export interface TestScenario {
  id: string
  profile: TestProfile
  title: string
  priority: 'P0' | 'P1' | 'P2'
  steps: string
  expected: string
}

export interface FeedbackResult {
  profile: TestProfile
  scenarioId: string
  status: FeedbackStatus
  createdAt: Date
}

export interface ScenarioProgress {
  total: number
  tested: number
  passed: number
  failed: number
  blocked: number
  remaining: number
  currentResults: FeedbackResult[]
}

export type CampaignSubmissionAvailability = 'available' | 'closed' | 'profile_not_enabled'

export function isTestProfileEnabled(profiles: TestProfile[], profile: TestProfile): boolean {
  return profiles.includes(profile)
}

export function getCampaignSubmissionAvailability(input: {
  campaignStatus: string
  enabledProfiles: TestProfile[]
  submittedProfile: TestProfile
}): CampaignSubmissionAvailability {
  if (input.campaignStatus !== 'ACTIVE') return 'closed'
  return isTestProfileEnabled(input.enabledProfiles, input.submittedProfile)
    ? 'available'
    : 'profile_not_enabled'
}

export function resolveFeedbackScenarios(
  scenarios: TestScenario[],
  submissions: Array<{
    scenarioId: string
    status: FeedbackStatus
    comment?: string
  }>,
): Array<{
  scenarioId: string
  scenarioTitle: string
  scenarioPriority: TestScenario['priority']
  status: FeedbackStatus
  comment?: string
}> | null {
  const scenariosById = new Map(scenarios.map((scenario) => [scenario.id, scenario]))
  const resolved = []
  for (const submission of submissions) {
    const scenario = scenariosById.get(submission.scenarioId)
    if (!scenario) return null
    resolved.push({
      scenarioId: scenario.id,
      scenarioTitle: scenario.title,
      scenarioPriority: scenario.priority,
      status: submission.status,
      ...(submission.comment ? { comment: submission.comment } : {}),
    })
  }
  return resolved
}

function readScenarioField(block: string, label: 'Étapes' | 'Attendu'): string {
  const match = block.match(new RegExp(String.raw`\*\*${label} :\*\*\s*([\s\S]*?)(?=\n\*\*|$)`))
  return match?.[1]?.replace(/`([^`]+)`/g, '$1').replace(/\*\*(.*?)\*\*/g, '$1').replace(/\s+/g, ' ').trim() ?? ''
}

export function parseScenarioGuide(content: string, profile: TestProfile): TestScenario[] {
  const prefix = profile === 'ADMIN' ? 'ADM' : 'CUS'
  return content
    .split(/(?=^#### \[ \] (?:ADM|CUS)-\d{2} — )/gm)
    .flatMap((block): TestScenario[] => {
      const header = block.match(/^#### \[ \] ((?:ADM|CUS)-\d{2}) — (.+)$/m)
      if (!header || !header[1].startsWith(`${prefix}-`)) return []

      const priority = block.match(/\*\*Priorité : (P[0-2])/)
      const steps = readScenarioField(block, 'Étapes')
      const expected = readScenarioField(block, 'Attendu')
      const priorityValue = priority?.[1]
      if (
        (priorityValue !== 'P0' && priorityValue !== 'P1' && priorityValue !== 'P2')
        || !steps
        || !expected
      ) {
        throw new Error(`Scenario ${header[1]} is missing its priority, steps, or expected result`)
      }

      return [{
        id: header[1],
        profile,
        title: header[2].trim(),
        priority: priorityValue,
        steps,
        expected,
      }]
    })
}

export function getScenarioProgress(
  profiles: TestProfile[],
  scenarioCounts: Record<TestProfile, number>,
  feedback: FeedbackResult[],
): ScenarioProgress {
  const total = profiles.reduce((count, profile) => count + scenarioCounts[profile], 0)
  const latestByScenario = new Map<string, FeedbackResult>()
  for (const result of feedback) {
    const key = `${result.profile}:${result.scenarioId}`
    const previous = latestByScenario.get(key)
    if (!previous || result.createdAt.getTime() > previous.createdAt.getTime()) {
      latestByScenario.set(key, result)
    }
  }

  const currentResults = [...latestByScenario.values()].sort((left, right) => (
    left.profile.localeCompare(right.profile) || left.scenarioId.localeCompare(right.scenarioId)
  ))
  const passed = currentResults.filter(({ status }) => status === 'PASS').length
  const failed = currentResults.filter(({ status }) => status === 'FAIL').length
  const blocked = currentResults.filter(({ status }) => status === 'BLOCKED').length
  const tested = currentResults.length

  return {
    total,
    tested,
    passed,
    failed,
    blocked,
    remaining: Math.max(0, total - tested),
    currentResults,
  }
}

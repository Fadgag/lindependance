import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import {
  getCampaignSubmissionAvailability,
  isTestProfileEnabled,
  resolveFeedbackScenarios,
  type TestScenario,
} from '@/domain/test-feedback/scenarios'
import {
  getCustomerPortalSecret,
  hashRateLimitKey,
} from '@/lib/customerPortalSecurity'
import { consumePortalRateLimits } from '@/services/customerPortal.service'
import {
  createTestFeedback,
  getPublicTestCampaign,
  loadScenarioCatalog,
} from '@/services/testFeedback.service'
import {
  CampaignTokenSchema,
  TestFeedbackSubmissionSchema,
  TestProfileSchema,
} from '@/schemas/testFeedback'
import {
  filterScenariosByGroups,
  getDefaultScenarioGroupsForProfiles,
  TestScenarioGroupSchema,
} from '@/domain/test-feedback/scenarioGroups'

const SUBMISSION_WINDOW_MS = 60 * 60 * 1000
const SUBMISSION_LIMIT = 60
type PublicFeedbackContext = { params: Promise<{ campaignToken: string }> }

export async function GET(request: Request, { params }: PublicFeedbackContext) {
  const token = CampaignTokenSchema.safeParse((await params).campaignToken)
  if (!token.success) return NextResponse.json({ error: 'Lien de campagne invalide' }, { status: 404 })

  try {
    const campaign = await getPublicTestCampaign(token.data)
    if (!campaign) return NextResponse.json({ error: 'Campagne introuvable' }, { status: 404 })
    const profiles = TestProfileSchema.array().parse(campaign.profiles)
    const scenarioGroups = campaign.scenarioGroups.length
      ? TestScenarioGroupSchema.array().parse(campaign.scenarioGroups)
      : getDefaultScenarioGroupsForProfiles(profiles)
    const profileParam = new URL(request.url).searchParams.get('profile')
    let scenarios: TestScenario[] = []
    if (profileParam) {
      const profile = TestProfileSchema.safeParse(profileParam)
      if (!profile.success || !isTestProfileEnabled(profiles, profile.data)) {
        return NextResponse.json({ error: 'Profil non disponible pour cette campagne' }, { status: 400 })
      }
      scenarios = filterScenariosByGroups(loadScenarioCatalog()[profile.data], scenarioGroups)
    }

    return NextResponse.json({
      name: campaign.name,
      scenarioGroups,
      status: campaign.status,
      organizationName: campaign.organization.name,
      profiles,
      scenarios,
    })
  } catch (error: unknown) {
    logger.error('Could not load public test campaign', error)
    return NextResponse.json({ error: 'Impossible de charger cette campagne' }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: PublicFeedbackContext) {
  const token = CampaignTokenSchema.safeParse((await params).campaignToken)
  if (!token.success) return NextResponse.json({ error: 'Lien de campagne invalide' }, { status: 404 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 })
  }
  const parsed = TestFeedbackSubmissionSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Résultats invalides' }, { status: 400 })

  try {
    const campaign = await getPublicTestCampaign(token.data)
    if (!campaign) return NextResponse.json({ error: 'Campagne introuvable' }, { status: 404 })
    const profiles = TestProfileSchema.array().parse(campaign.profiles)
    const scenarioGroups = campaign.scenarioGroups.length
      ? TestScenarioGroupSchema.array().parse(campaign.scenarioGroups)
      : getDefaultScenarioGroupsForProfiles(profiles)
    const availability = getCampaignSubmissionAvailability({
      campaignStatus: campaign.status,
      enabledProfiles: profiles,
      submittedProfile: parsed.data.profile,
    })
    if (availability === 'closed') {
      return NextResponse.json({ error: 'Cette campagne est clôturée' }, { status: 410 })
    }
    if (availability === 'profile_not_enabled') {
      return NextResponse.json({ error: 'Profil non disponible pour cette campagne' }, { status: 400 })
    }

    const scenarios = filterScenariosByGroups(
      loadScenarioCatalog()[parsed.data.profile],
      scenarioGroups,
    )
    const results = resolveFeedbackScenarios(scenarios, parsed.data.results)
    if (!results) {
      return NextResponse.json({ error: 'Un scénario ne correspond pas au guide de recette' }, { status: 400 })
    }

    const allowed = await consumePortalRateLimits([{
      scope: 'test-feedback-campaign-submission',
      keyHash: hashRateLimitKey(
        'test-feedback-campaign-submission',
        token.data,
        getCustomerPortalSecret(),
      ),
      limit: SUBMISSION_LIMIT,
      windowMilliseconds: SUBMISSION_WINDOW_MS,
    }])
    if (!allowed) {
      return NextResponse.json({ error: 'Trop d’envois pour cette campagne. Réessayez plus tard.' }, { status: 429 })
    }

    const created = await createTestFeedback({
      publicToken: token.data,
      profile: parsed.data.profile,
      ...(parsed.data.environment ? { environment: parsed.data.environment } : {}),
      results,
    })
    if (!created) {
      return NextResponse.json({ error: 'Cette campagne est clôturée ou le profil n’est plus disponible' }, { status: 410 })
    }
    return NextResponse.json({ created: parsed.data.results.length }, { status: 201 })
  } catch (error: unknown) {
    logger.error('Could not save public test feedback', error)
    return NextResponse.json({ error: 'Impossible d’enregistrer ces résultats' }, { status: 500 })
  }
}

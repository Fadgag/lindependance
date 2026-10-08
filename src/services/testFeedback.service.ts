import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import {
  getScenarioProgress,
  parseScenarioGuide,
  getCampaignSubmissionAvailability,
  type FeedbackResult,
  type TestProfile,
  type TestScenario,
} from '@/domain/test-feedback/scenarios'
import {
  filterScenariosByGroups,
  getDefaultScenarioGroupsForProfiles,
  isScenarioInGroups,
  TestScenarioGroupSchema,
  type TestScenarioGroupId,
} from '@/domain/test-feedback/scenarioGroups'
import {
  FeedbackStatusSchema,
  TestCampaignReviewSubmissionSchema,
  TestProfileSchema,
} from '@/schemas/testFeedback'

export function loadScenarioCatalog(): Record<TestProfile, TestScenario[]> {
  return {
    ADMIN: parseScenarioGuide(
      readFileSync(join(process.cwd(), 'quality/recette-beta-admin.md'), 'utf8'),
      'ADMIN',
    ),
    USER: parseScenarioGuide(
      readFileSync(join(process.cwd(), 'quality/recette-beta-customer.md'), 'utf8'),
      'USER',
    ),
  }
}

function parseProfiles(profiles: string[]): TestProfile[] {
  return zProfileArray.parse(profiles)
}

function parseScenarioGroups(groups: string[], profiles: TestProfile[]): TestScenarioGroupId[] {
  if (groups.length === 0) return getDefaultScenarioGroupsForProfiles(profiles)
  return TestScenarioGroupSchema.array().min(1).max(4).parse(groups)
}

const zProfileArray = TestProfileSchema.array().min(1).max(2)

function mapFeedbackRows(
  rows: Array<{ profile: string; scenarioId: string; status: string; createdAt: Date }>,
): FeedbackResult[] {
  return rows.map((row) => ({
    profile: TestProfileSchema.parse(row.profile),
    scenarioId: row.scenarioId,
    status: FeedbackStatusSchema.parse(row.status),
    createdAt: row.createdAt,
  }))
}

function getScenarioCounts(
  catalog: Record<TestProfile, TestScenario[]>,
  scenarioGroups: TestScenarioGroupId[],
) {
  return {
    ADMIN: filterScenariosByGroups(catalog.ADMIN, scenarioGroups).length,
    USER: filterScenariosByGroups(catalog.USER, scenarioGroups).length,
  }
}

export async function listTestCampaigns(organizationIds?: string[]) {
  const [campaigns, organizations] = await Promise.all([
    prisma.testCampaign.findMany({
      ...(organizationIds?.length ? { where: { organizationId: { in: organizationIds } } } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        organization: { select: { name: true } },
        feedback: {
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          select: { profile: true, scenarioId: true, status: true, createdAt: true },
        },
      },
    }),
    prisma.organization.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ])
  const catalog = loadScenarioCatalog()

  return {
    organizations,
    campaigns: campaigns.map((campaign) => {
      const profiles = parseProfiles(campaign.profiles)
      const scenarioGroups = parseScenarioGroups(campaign.scenarioGroups, profiles)
      return {
        id: campaign.id,
        name: campaign.name,
        scenarioGroups,
        profiles,
        status: campaign.status,
        publicToken: campaign.publicToken,
        createdAt: campaign.createdAt,
        closedAt: campaign.closedAt,
        organizationName: campaign.organization.name,
        progress: getScenarioProgress(
          profiles,
          getScenarioCounts(catalog, scenarioGroups),
          mapFeedbackRows(campaign.feedback),
        ),
      }
    }),
  }
}

type TestCampaignRecipientRef = { source: 'USER' | 'CUSTOMER'; id: string }
type TestCampaignRecipient =
  | { id: string; name: string | null; email: string; source: 'USER'; role: 'ADMIN' | 'USER' }
  | { id: string; name: string | null; email: string; source: 'CUSTOMER' }

function normalizedRecipientEmail(value: string | null): string | null {
  const parsed = z.string().trim().email().safeParse(value)
  return parsed.success ? parsed.data : null
}

export async function listTestCampaignRecipients(
  organizationId: string,
  recipientIds?: TestCampaignRecipientRef[],
) {
  const userIds = recipientIds
    ?.filter(({ source }) => source === 'USER')
    .map(({ id }) => id)
  const customerIds = recipientIds
    ?.filter(({ source }) => source === 'CUSTOMER')
    .map(({ id }) => id)
  const [users, customers] = await Promise.all([
    prisma.user.findMany({
      where: {
        organizationId,
        email: { not: null },
        role: { in: ['ADMIN', 'USER'] },
        ...(recipientIds ? { id: { in: userIds } } : {}),
      },
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
      select: { id: true, name: true, email: true, role: true },
    }),
    prisma.customer.findMany({
      where: {
        organizationId,
        email: { not: null },
        ...(recipientIds ? { id: { in: customerIds } } : {}),
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }, { email: 'asc' }],
      select: { id: true, firstName: true, lastName: true, email: true },
    }),
  ])

  const eligibleUsers: TestCampaignRecipient[] = users.flatMap((recipient) => {
    const email = normalizedRecipientEmail(recipient.email)
    if (!email || (recipient.role !== 'ADMIN' && recipient.role !== 'USER')) return []
    return [{
      id: recipient.id,
      name: recipient.name?.trim() || null,
      email,
      source: 'USER',
      role: recipient.role,
    }]
  })
  const eligibleCustomers: TestCampaignRecipient[] = customers.flatMap((recipient) => {
    const email = normalizedRecipientEmail(recipient.email)
    if (!email) return []
    const name = `${recipient.firstName.trim()} ${recipient.lastName.trim()}`.trim() || null
    return [{
      id: recipient.id,
      name,
      email,
      source: 'CUSTOMER',
    }]
  })

  const uniqueRecipients = new Map<string, TestCampaignRecipient>()
  for (const recipient of [...eligibleUsers, ...eligibleCustomers]) {
    const normalizedEmail = recipient.email.toLowerCase()
    if (!uniqueRecipients.has(normalizedEmail)) uniqueRecipients.set(normalizedEmail, recipient)
  }
  return [...uniqueRecipients.values()]
}

export async function createTestCampaign(input: {
  name: string
  organizationId: string
  profiles: TestProfile[]
  scenarioGroups: TestScenarioGroupId[]
}) {
  const organization = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    select: { id: true, name: true },
  })
  if (!organization) return null

  const campaign = await prisma.testCampaign.create({
    data: {
      name: input.name,
      build: null,
      organizationId: input.organizationId,
      profiles: input.profiles,
      scenarioGroups: input.scenarioGroups,
      publicToken: randomBytes(32).toString('base64url'),
    },
    select: {
      id: true,
      name: true,
      status: true,
      publicToken: true,
      createdAt: true,
    },
  })
  return { ...campaign, organizationName: organization.name }
}

export async function getTestCampaignDetail(id: string) {
  const campaign = await prisma.testCampaign.findUnique({
    where: { id },
    include: {
      organization: { select: { name: true } },
      feedback: { orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] },
      campaignReviews: {
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      },
    },
  })
  if (!campaign) return null

  const profiles = parseProfiles(campaign.profiles)
  const scenarioGroups = parseScenarioGroups(campaign.scenarioGroups, profiles)
  const catalog = loadScenarioCatalog()
  const feedback = mapFeedbackRows(campaign.feedback)
  const progress = getScenarioProgress(
    profiles,
    getScenarioCounts(catalog, scenarioGroups),
    feedback,
  )
  const latestFeedback = new Map<string, (typeof campaign.feedback)[number]>()
  for (const result of campaign.feedback) {
    const key = `${result.profile}:${result.scenarioId}`
    if (!latestFeedback.has(key)) latestFeedback.set(key, result)
  }

  return {
    campaign: {
      id: campaign.id,
      name: campaign.name,
      scenarioGroups,
      profiles,
      status: campaign.status,
      publicToken: campaign.publicToken,
      createdAt: campaign.createdAt,
      closedAt: campaign.closedAt,
      organizationName: campaign.organization.name,
    },
    progress,
    scenarios: profiles.flatMap((profile) => (
      filterScenariosByGroups(catalog[profile], scenarioGroups).map((scenario) => ({
        ...scenario,
        result: latestFeedback.get(`${profile}:${scenario.id}`) ?? null,
      }))
    )),
    history: campaign.feedback.map((entry) => ({
      id: entry.id,
      profile: TestProfileSchema.parse(entry.profile),
      scenarioId: entry.scenarioId,
      scenarioTitle: entry.scenarioTitle,
      scenarioPriority: entry.scenarioPriority,
      status: FeedbackStatusSchema.parse(entry.status),
      environment: entry.environment,
      comment: entry.comment,
      createdAt: entry.createdAt,
    })),
    campaignReviews: campaign.campaignReviews.map((review) => ({
      id: review.id,
      profile: TestProfileSchema.parse(review.profile),
      clarity: review.clarity,
      duration: review.duration,
      links: review.links,
      satisfaction: review.satisfaction,
      comment: review.comment,
      createdAt: review.createdAt,
    })),
  }
}

export async function closeTestCampaign(id: string): Promise<'closed' | 'already_closed' | 'not_found'> {
  const result = await prisma.testCampaign.updateMany({
    where: { id, status: 'ACTIVE' },
    data: { status: 'CLOSED', closedAt: new Date() },
  })
  if (result.count === 1) return 'closed'
  const existing = await prisma.testCampaign.findUnique({ where: { id }, select: { id: true } })
  return existing ? 'already_closed' : 'not_found'
}

export async function getPublicTestCampaign(publicToken: string) {
  return prisma.testCampaign.findUnique({
    where: { publicToken },
    select: {
      name: true,
      status: true,
      profiles: true,
      scenarioGroups: true,
      organization: { select: { name: true, slug: true, portalEnabled: true } },
    },
  })
}

export async function createTestFeedback(input: {
  publicToken: string
  profile: TestProfile
  environment?: string
  campaignReview?: z.infer<typeof TestCampaignReviewSubmissionSchema>
  results: Array<{
    scenarioId: string
    scenarioTitle: string
    scenarioPriority: string
    status: 'PASS' | 'FAIL' | 'BLOCKED'
    comment?: string
  }>
}): Promise<boolean> {
  return prisma.$transaction(async (transaction) => {
    const campaign = await transaction.testCampaign.findUnique({
      where: { publicToken: input.publicToken },
      select: {
        id: true,
        organizationId: true,
        status: true,
        profiles: true,
        scenarioGroups: true,
      },
    })
    const profiles = campaign ? parseProfiles(campaign.profiles) : []
    const scenarioGroups = campaign
      ? parseScenarioGroups(campaign.scenarioGroups, profiles)
      : []
    if (!campaign || getCampaignSubmissionAvailability({
      campaignStatus: campaign.status,
      enabledProfiles: profiles,
      submittedProfile: input.profile,
    }) !== 'available' || !input.results.every((result) => (
      isScenarioInGroups(input.profile, result.scenarioId, scenarioGroups)
    ))) {
      return false
    }

    const campaignReview = input.campaignReview
      ? TestCampaignReviewSubmissionSchema.safeParse(input.campaignReview)
      : null
    if (campaignReview && !campaignReview.success) return false

    await transaction.testFeedback.createMany({
      data: input.results.map((result) => ({
        campaignId: campaign.id,
        organizationId: campaign.organizationId,
        profile: input.profile,
        scenarioId: result.scenarioId,
        scenarioTitle: result.scenarioTitle,
        scenarioPriority: result.scenarioPriority,
        status: result.status,
        environment: input.environment || null,
        comment: result.comment || null,
      })),
    })
    if (campaignReview?.success) {
      await transaction.testCampaignReview.create({
        data: {
          campaignId: campaign.id,
          organizationId: campaign.organizationId,
          profile: input.profile,
          clarity: campaignReview.data.clarity ?? null,
          duration: campaignReview.data.duration ?? null,
          links: campaignReview.data.links ?? null,
          satisfaction: campaignReview.data.satisfaction ?? null,
          comment: campaignReview.data.comment || null,
        },
      })
    }
    return true
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
}

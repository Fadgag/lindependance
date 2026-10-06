import { z } from 'zod'
import { TestCampaignDetailResponseSchema } from '@/schemas/testFeedbackResponses'

type CampaignDetail = z.infer<typeof TestCampaignDetailResponseSchema>

export function buildTestCampaignExport({
  data,
  exportedAt,
}: {
  data: CampaignDetail
  exportedAt: string
}) {
  return {
    format: 'lindependance-test-campaign-feedback',
    version: 1,
    exportedAt,
    campaign: {
      name: data.campaign.name,
      organizationName: data.campaign.organizationName,
      scenarioGroups: data.campaign.scenarioGroups,
      profiles: data.campaign.profiles,
      status: data.campaign.status,
      createdAt: data.campaign.createdAt,
      closedAt: data.campaign.closedAt,
    },
    progress: {
      total: data.progress.total,
      tested: data.progress.tested,
      passed: data.progress.passed,
      failed: data.progress.failed,
      blocked: data.progress.blocked,
      remaining: data.progress.remaining,
    },
    scenarios: data.scenarios.map((scenario) => ({
      id: scenario.id,
      profile: scenario.profile,
      title: scenario.title,
      priority: scenario.priority,
      steps: scenario.steps,
      expected: scenario.expected,
      result: scenario.result ? {
        status: scenario.result.status,
        comment: scenario.result.comment,
        environment: scenario.result.environment,
        createdAt: scenario.result.createdAt,
      } : null,
    })),
    history: data.history.map((entry) => ({
      profile: entry.profile,
      scenarioId: entry.scenarioId,
      scenarioTitle: entry.scenarioTitle,
      scenarioPriority: entry.scenarioPriority,
      status: entry.status,
      environment: entry.environment,
      comment: entry.comment,
      createdAt: entry.createdAt,
    })),
    campaignReviews: data.campaignReviews.map((review) => ({
      profile: review.profile,
      clarity: review.clarity,
      duration: review.duration,
      links: review.links,
      satisfaction: review.satisfaction,
      comment: review.comment,
      createdAt: review.createdAt,
    })),
  }
}

export function buildTestCampaignExportFilename(name: string, exportedAt: Date): string {
  const slug = name.normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'campagne'
  return `${slug}-${exportedAt.toISOString().slice(0, 10)}.json`
}

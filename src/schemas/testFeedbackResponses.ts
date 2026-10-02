import { z } from 'zod'
import { TestScenarioGroupSchema } from '@/domain/test-feedback/scenarioGroups'
import { FeedbackStatusSchema, TestProfileSchema } from './testFeedback'

const ScenarioSchema = z.object({
  id: z.string(),
  profile: TestProfileSchema,
  title: z.string(),
  priority: z.enum(['P0', 'P1', 'P2']),
  steps: z.string(),
  expected: z.string(),
})

const FeedbackResultSchema = z.object({
  profile: TestProfileSchema,
  scenarioId: z.string(),
  status: FeedbackStatusSchema,
  createdAt: z.string(),
})

const ProgressSchema = z.object({
  total: z.number(),
  tested: z.number(),
  passed: z.number(),
  failed: z.number(),
  blocked: z.number(),
  remaining: z.number(),
  currentResults: z.array(FeedbackResultSchema),
})

export const TestCampaignListResponseSchema = z.object({
  organizations: z.array(z.object({ id: z.string(), name: z.string() })),
  campaigns: z.array(z.object({
    id: z.string(),
    name: z.string(),
    scenarioGroups: z.array(TestScenarioGroupSchema),
    profiles: z.array(TestProfileSchema),
    status: z.enum(['ACTIVE', 'CLOSED']),
    publicToken: z.string(),
    createdAt: z.string(),
    closedAt: z.string().nullable(),
    organizationName: z.string(),
    progress: ProgressSchema,
  })),
})

export const TestCampaignRecipientListResponseSchema = z.array(z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().email(),
  role: z.enum(['ADMIN', 'USER']),
}))

export const TestCampaignCreationResponseSchema = z.object({
  invitations: z.object({
    sent: z.number().int().nonnegative(),
    failedRecipients: z.array(z.string()),
    deliveryError: z.string().nullable(),
  }),
})

export const TestCampaignDetailResponseSchema = z.object({
  campaign: z.object({
    id: z.string(),
    name: z.string(),
    scenarioGroups: z.array(TestScenarioGroupSchema),
    profiles: z.array(TestProfileSchema),
    status: z.enum(['ACTIVE', 'CLOSED']),
    publicToken: z.string(),
    createdAt: z.string(),
    closedAt: z.string().nullable(),
    organizationName: z.string(),
  }),
  progress: ProgressSchema,
  scenarios: z.array(ScenarioSchema.extend({
    result: z.object({
      id: z.string(),
      status: FeedbackStatusSchema,
      comment: z.string().nullable(),
      environment: z.string().nullable(),
      createdAt: z.string(),
    }).nullable(),
  })),
  history: z.array(z.object({
    id: z.string(),
    profile: TestProfileSchema,
    scenarioId: z.string(),
    scenarioTitle: z.string(),
    scenarioPriority: z.string(),
    status: FeedbackStatusSchema,
    environment: z.string().nullable(),
    comment: z.string().nullable(),
    createdAt: z.string(),
  })),
})

export const PublicTestCampaignResponseSchema = z.object({
  name: z.string(),
  scenarioGroups: z.array(TestScenarioGroupSchema),
  status: z.enum(['ACTIVE', 'CLOSED']),
  organizationName: z.string(),
  profiles: z.array(TestProfileSchema),
  scenarios: z.array(ScenarioSchema),
})

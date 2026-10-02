import { z } from 'zod'
import {
  isValidTestCampaignScope,
  TestScenarioGroupSchema,
} from '@/domain/test-feedback/scenarioGroups'

export const TestProfileSchema = z.enum(['ADMIN', 'USER'])
export const FeedbackStatusSchema = z.enum(['PASS', 'FAIL', 'BLOCKED'])
export const DEFAULT_TEST_CAMPAIGN_EMAIL_SUBJECT = 'Invitation à la campagne de recette'
export const DEFAULT_TEST_CAMPAIGN_EMAIL_MESSAGE = 'Vous êtes invité(e) à participer à cette campagne de recette.'

export const CreateTestCampaignSchema = z.object({
  name: z.string().trim().min(1).max(100),
  organizationId: z.string().min(1).max(64),
  profiles: z.array(TestProfileSchema).min(1).max(2)
    .refine((profiles) => new Set(profiles).size === profiles.length),
  scenarioGroups: z.array(TestScenarioGroupSchema).min(1).max(4)
    .refine((groups) => new Set(groups).size === groups.length),
  recipientIds: z.array(z.string().min(1).max(64)).max(50).default([])
    .refine((recipientIds) => new Set(recipientIds).size === recipientIds.length),
  emailSubject: z.string().trim().min(1).max(120)
    .refine((subject) => !/[\r\n]/.test(subject), 'L’objet de l’e-mail ne peut pas contenir de retour à la ligne.')
    .default(DEFAULT_TEST_CAMPAIGN_EMAIL_SUBJECT),
  emailMessage: z.string().trim().max(2000).default(DEFAULT_TEST_CAMPAIGN_EMAIL_MESSAGE),
}).strict().superRefine(({ profiles, scenarioGroups }, context) => {
  if (!isValidTestCampaignScope(profiles, scenarioGroups)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Chaque profil doit avoir au moins un groupe de scénarios correspondant.',
      path: ['scenarioGroups'],
    })
  }
})

export const CampaignIdSchema = z.string().cuid()
export const CampaignTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{40,60}$/)

export const CloseTestCampaignSchema = z.object({
  status: z.literal('CLOSED'),
}).strict()

export const TestFeedbackSubmissionSchema = z.object({
  profile: TestProfileSchema,
  environment: z.string().trim().max(120).optional(),
  results: z.array(z.object({
    scenarioId: z.string().regex(/^(?:ADM|CUS)-\d{2}$/),
    status: FeedbackStatusSchema,
    comment: z.string().trim().max(2000).optional(),
  }).strict()).min(1).max(17)
    .refine((results) => new Set(results.map(({ scenarioId }) => scenarioId)).size === results.length)
    .superRefine((results, context) => {
      results.forEach((result, index) => {
        if (result.status !== 'PASS' && !result.comment) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Un commentaire est obligatoire pour un échec ou un blocage.',
            path: [index, 'comment'],
          })
        }
      })
    }),
}).strict()

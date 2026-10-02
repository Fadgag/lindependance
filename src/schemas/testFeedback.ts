import { z } from 'zod'

export const TestProfileSchema = z.enum(['ADMIN', 'USER'])
export const FeedbackStatusSchema = z.enum(['PASS', 'FAIL', 'BLOCKED'])

export const CreateTestCampaignSchema = z.object({
  name: z.string().trim().min(1).max(100),
  organizationId: z.string().min(1).max(64),
  build: z.string().trim().min(1).max(128),
  profiles: z.array(TestProfileSchema).min(1).max(2)
    .refine((profiles) => new Set(profiles).size === profiles.length),
}).strict()

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

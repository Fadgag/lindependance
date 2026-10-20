import { z } from 'zod'

export const TechAdminOrganizationsSchema = z.array(z.object({
  id: z.string().min(1),
  name: z.string().min(1),
}))

export const TechAdminOrganizationFilterSchema = z.object({
  organizationIds: z.array(z.string().trim().min(1).max(128)),
}).strict()

export const CreateTestSalonSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(['USER', 'ADMIN']).default('USER'),
  confirmControlledEmail: z.literal(true),
}).strict()

export type CreateTestSalonInput = z.infer<typeof CreateTestSalonSchema>

export const TestSalonProvisionResponseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  customerEmail: z.string().email(),
  staffAccount: z.object({
    email: z.string().email(),
    role: z.enum(['USER', 'ADMIN']),
  }).strict(),
  invitation: z.object({
    sent: z.boolean(),
    error: z.string().nullable(),
  }).strict(),
}).strict()

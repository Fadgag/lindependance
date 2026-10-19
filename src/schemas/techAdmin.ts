import { z } from 'zod'

export const TechAdminOrganizationsSchema = z.array(z.object({
  id: z.string().min(1),
  name: z.string().min(1),
}))

export const TechAdminOrganizationFilterSchema = z.object({
  organizationIds: z.array(z.string().trim().min(1).max(128)),
}).strict()

export const CreateTestSalonSchema = z.object({}).strict()

export const TestSalonProvisionResponseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  customerEmail: z.string().email(),
}).strict()

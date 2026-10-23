import { z } from 'zod'

export const OrganizationAccountRoleSchema = z.enum(['USER', 'ADMIN'])

export const CreateOrganizationAccountSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  name: z.string().trim().min(1).max(100).optional(),
  role: OrganizationAccountRoleSchema.default('USER'),
  confirmControlledEmail: z.literal(true),
}).strict()

export const UpdateOrganizationAccountSchema = z.object({
  role: OrganizationAccountRoleSchema,
}).strict()

export const OrganizationAccountSchema = z.object({
  id: z.string().min(1),
  name: z.string().nullable(),
  email: z.string().email().nullable(),
  role: OrganizationAccountRoleSchema,
  activationStatus: z.enum(['ACTIVE', 'PENDING']),
}).strict()

export const OrganizationAccountsSchema = z.array(OrganizationAccountSchema)

export const OrganizationAccountInvitationResponseSchema = z.object({
  account: z.object({
    id: z.string().min(1),
    name: z.string().nullable(),
    email: z.string().email(),
    role: OrganizationAccountRoleSchema,
  }).strict(),
  invitation: z.object({
    sent: z.boolean(),
    error: z.string().nullable(),
  }).strict(),
}).strict()

export type CreateOrganizationAccountInput = z.infer<typeof CreateOrganizationAccountSchema>
export type OrganizationAccountRole = z.infer<typeof OrganizationAccountRoleSchema>

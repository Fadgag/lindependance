import { z } from 'zod'

export const MAX_LOGO_DATA_URL_LENGTH = 400_000

const logoDataUrlSchema = z.string()
  .max(MAX_LOGO_DATA_URL_LENGTH)
  .regex(
    /^data:image\/(?:png|jpeg|webp);base64,(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})$/,
    'Format de logo invalide',
  )

export const logoShapeSchema = z.enum(['circle', 'square'])
const organizationNameSchema = z.string()
  .trim()
  .min(1, 'Le nom est obligatoire')
  .max(100)
  .regex(/^[^\u0000-\u001f\u007f]+$/, 'Le nom doit tenir sur une seule ligne')

export const organizationBrandingUpdateSchema = z.object({
  logoDataUrl: logoDataUrlSchema.nullable().optional(),
  logoShape: logoShapeSchema.optional(),
  organizationName: organizationNameSchema.optional(),
  showNameWithLogo: z.boolean().optional(),
}).strict().refine(
  (update) => update.logoDataUrl !== undefined
    || update.logoShape !== undefined
    || update.organizationName !== undefined
    || update.showNameWithLogo !== undefined,
  'Au moins un réglage doit être fourni',
)

export const organizationBrandingSchema = z.object({
  logoDataUrl: logoDataUrlSchema.nullable(),
  logoShape: logoShapeSchema,
  organizationName: organizationNameSchema,
  showNameWithLogo: z.boolean(),
})

export type OrganizationBrandingUpdate = z.infer<typeof organizationBrandingUpdateSchema>
export type OrganizationBranding = z.infer<typeof organizationBrandingSchema>
export type LogoShape = z.infer<typeof logoShapeSchema>

export const DEFAULT_ORGANIZATION_BRANDING: OrganizationBranding = {
  logoDataUrl: null,
  logoShape: 'circle',
  organizationName: 'Atelier Studio Coiffure',
  showNameWithLogo: false,
}

import { z } from 'zod'

export const MAX_LOGO_DATA_URL_LENGTH = 400_000

const logoDataUrlSchema = z.string()
  .max(MAX_LOGO_DATA_URL_LENGTH)
  .regex(
    /^data:image\/(?:png|jpeg|webp);base64,(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})$/,
    'Format de logo invalide',
  )

export const logoShapeSchema = z.enum(['circle', 'square'])
export const logoSizeSchema = z.enum(['small', 'medium', 'large'])
export const portalNameFontSchema = z.enum(['manrope', 'notoSerif', 'rounded'])
export const portalNameColorSchema = z.enum(['charcoal', 'indigo', 'emerald', 'plum', 'rose'])
export const portalNameWeightSchema = z.enum(['normal', 'semibold', 'bold'])
export const portalNameAlignmentSchema = z.enum(['left', 'center', 'right'])
export const portalNameSizeSchema = z.number().int().min(14).max(24)
export const portalLogoSizeSchema = z.number().int().min(24).max(160)
const organizationNameSchema = z.string()
  .trim()
  .min(1, 'Le nom est obligatoire')
  .max(100)
  .regex(/^[^\u0000-\u001f\u007f]+$/, 'Le nom doit tenir sur une seule ligne')

export const PORTAL_BRAND_FONTS: { value: PortalNameFont; label: string }[] = [
  { value: 'manrope', label: 'Moderne (Manrope)' },
  { value: 'notoSerif', label: 'Élégante (Noto Serif)' },
  { value: 'rounded', label: 'Arrondie' },
]

export const PORTAL_BRAND_COLORS: Record<PortalNameColor, { label: string; hex: string }> = {
  charcoal: { label: 'Anthracite', hex: '#111827' },
  indigo: { label: 'Indigo', hex: '#1d4ed8' },
  emerald: { label: 'Émeraude', hex: '#047857' },
  plum: { label: 'Prune', hex: '#6d28d9' },
  rose: { label: 'Framboise', hex: '#be123c' },
}

export const portalAppearanceSchema = z.object({
  logoDataUrl: logoDataUrlSchema.nullable(),
  logoShape: logoShapeSchema,
  portalNameFont: portalNameFontSchema,
  portalNameSize: portalNameSizeSchema,
  portalNameColor: portalNameColorSchema,
  portalNameWeight: portalNameWeightSchema,
  portalNameAlignment: portalNameAlignmentSchema,
  portalLogoSize: portalLogoSizeSchema,
})

export const organizationBrandingUpdateSchema = z.object({
  logoDataUrl: logoDataUrlSchema.nullable().optional(),
  logoShape: logoShapeSchema.optional(),
  logoSize: logoSizeSchema.optional(),
  organizationName: organizationNameSchema.optional(),
  showNameWithLogo: z.boolean().optional(),
  portalNameFont: portalNameFontSchema.optional(),
  portalNameSize: portalNameSizeSchema.optional(),
  portalNameColor: portalNameColorSchema.optional(),
  portalNameWeight: portalNameWeightSchema.optional(),
  portalNameAlignment: portalNameAlignmentSchema.optional(),
  portalLogoSize: portalLogoSizeSchema.optional(),
}).strict().refine(
  (update) => update.logoDataUrl !== undefined
    || update.logoShape !== undefined
    || update.logoSize !== undefined
    || update.organizationName !== undefined
    || update.showNameWithLogo !== undefined
    || update.portalNameFont !== undefined
    || update.portalNameSize !== undefined
    || update.portalNameColor !== undefined
    || update.portalNameWeight !== undefined
    || update.portalNameAlignment !== undefined
    || update.portalLogoSize !== undefined,
  'Au moins un réglage doit être fourni',
)

export const organizationBrandingSchema = portalAppearanceSchema.extend({
  logoSize: logoSizeSchema,
  organizationName: organizationNameSchema,
  showNameWithLogo: z.boolean(),
})

export type OrganizationBrandingUpdate = z.infer<typeof organizationBrandingUpdateSchema>
export type OrganizationBranding = z.infer<typeof organizationBrandingSchema>
export type LogoShape = z.infer<typeof logoShapeSchema>
export type LogoSize = z.infer<typeof logoSizeSchema>
export type PortalNameFont = z.infer<typeof portalNameFontSchema>
export type PortalNameColor = z.infer<typeof portalNameColorSchema>
export type PortalNameWeight = z.infer<typeof portalNameWeightSchema>
export type PortalNameAlignment = z.infer<typeof portalNameAlignmentSchema>
export type PortalAppearance = z.infer<typeof portalAppearanceSchema>

export function getPortalLogoSizeForViewport(
  size: number,
  viewport: 'mobile' | 'desktop',
): number {
  return Math.min(size, viewport === 'mobile' ? 128 : 160)
}

export const DEFAULT_ORGANIZATION_BRANDING: OrganizationBranding = {
  logoDataUrl: null,
  logoShape: 'circle',
  logoSize: 'medium',
  organizationName: 'Atelier Studio Coiffure',
  showNameWithLogo: false,
  portalNameFont: 'manrope',
  portalNameSize: 18,
  portalNameColor: 'charcoal',
  portalNameWeight: 'semibold',
  portalNameAlignment: 'left',
  portalLogoSize: 48,
}

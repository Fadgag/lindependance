import { describe, expect, it } from 'vitest'
import {
  DEFAULT_ORGANIZATION_BRANDING,
  PORTAL_BRAND_COLORS,
  getOrganizationLogoSizeForViewport,
  getPortalLogoSizeForViewport,
  organizationBrandingSchema,
  organizationBrandingUpdateSchema,
} from '@/domain/branding/logoSettings'

describe('organizationBrandingUpdateSchema', () => {
  it('accepts supported logo data and either display shape', () => {
    expect(organizationBrandingUpdateSchema.parse({
      logoDataUrl: 'data:image/webp;base64,AA==',
      logoShape: 'circle',
    })).toEqual({
      logoDataUrl: 'data:image/webp;base64,AA==',
      logoShape: 'circle',
    })
    expect(organizationBrandingUpdateSchema.parse({ logoShape: 'square' })).toEqual({
      logoShape: 'square',
    })
  })

  describe('portal branding settings', () => {
    it('provides accessible default appearance settings', () => {
      expect(DEFAULT_ORGANIZATION_BRANDING).toMatchObject({
        portalNameFont: 'manrope',
        portalNameSize: 18,
        portalNameColor: 'charcoal',
        portalNameWeight: 'semibold',
        portalNameAlignment: 'left',
        portalLogoSize: 48,
      })
    })

    it('accepts supported appearance options and rejects arbitrary CSS values', () => {
      const settings = {
        organizationName: 'Atelier',
        logoDataUrl: null,
        logoShape: 'square',
        showNameWithLogo: true,
        portalNameFont: 'notoSerif',
        portalNameSize: 24,
        portalNameColor: 'indigo',
        portalNameWeight: 'bold',
        portalNameAlignment: 'center',
        portalLogoSize: 160,
      }

      expect(organizationBrandingSchema.safeParse(settings).success).toBe(true)
      expect(organizationBrandingUpdateSchema.safeParse({ portalNameColor: 'red; background:url(x)' }).success)
        .toBe(false)
      expect(organizationBrandingUpdateSchema.safeParse({ portalNameSize: 13 }).success).toBe(false)
      expect(organizationBrandingUpdateSchema.safeParse({ portalNameSize: 25 }).success).toBe(false)
      expect(organizationBrandingUpdateSchema.safeParse({ portalLogoSize: 23 }).success).toBe(false)
      expect(organizationBrandingUpdateSchema.safeParse({ portalLogoSize: 161 }).success).toBe(false)
      expect(organizationBrandingUpdateSchema.safeParse({ logoSize: 'large' }).success).toBe(false)
    })

    it('caps the shared logo size for the available management navigation space', () => {
      expect(getOrganizationLogoSizeForViewport(160, 'sidebar')).toBe(64)
      expect(getOrganizationLogoSizeForViewport(160, 'mobile')).toBe(48)
      expect(getOrganizationLogoSizeForViewport(24, 'sidebar')).toBe(24)
      expect(getOrganizationLogoSizeForViewport(24, 'mobile')).toBe(24)
    })

    it('caps logo rendering responsively without changing the stored size', () => {
      expect(getPortalLogoSizeForViewport(160, 'mobile')).toBe(128)
      expect(getPortalLogoSizeForViewport(160, 'desktop')).toBe(160)
      expect(getPortalLogoSizeForViewport(48, 'mobile')).toBe(48)
    })

    it('uses only colors with readable contrast on white', () => {
      for (const { hex } of Object.values(PORTAL_BRAND_COLORS)) {
        const match = /^#([0-9a-f]{6})$/i.exec(hex)
        if (!match) throw new Error(`Invalid color: ${hex}`)
        const channels = [0, 2, 4].map((offset) => Number.parseInt(match[1].slice(offset, offset + 2), 16) / 255)
        const linearize = (channel: number) => (
          channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
        )
        const luminance = 0.2126 * linearize(channels[0] ?? 0)
          + 0.7152 * linearize(channels[1] ?? 0)
          + 0.0722 * linearize(channels[2] ?? 0)

        expect(1.05 / (luminance + 0.05)).toBeGreaterThanOrEqual(4.5)
      }
    })
  })

  it('allows removing a saved logo', () => {
    expect(organizationBrandingUpdateSchema.parse({ logoDataUrl: null })).toEqual({
      logoDataUrl: null,
    })
  })

  it('normalizes organization names and accepts the name display preference', () => {
    expect(organizationBrandingUpdateSchema.parse({
      organizationName: '  Studio Étoile  ',
      showNameWithLogo: true,
    })).toEqual({
      organizationName: 'Studio Étoile',
      showNameWithLogo: true,
    })
    expect(organizationBrandingUpdateSchema.safeParse({ organizationName: '   ' }).success).toBe(false)
    expect(organizationBrandingUpdateSchema.safeParse({ organizationName: 'Studio\nÉtoile' }).success).toBe(false)
    expect(organizationBrandingUpdateSchema.safeParse({ logoSize: 'large' }).success).toBe(false)
  })

  it('rejects unsupported image formats, malformed data, and empty updates', () => {
    expect(organizationBrandingUpdateSchema.safeParse({
      logoDataUrl: 'data:image/svg+xml;base64,PHN2Zy8+',
    }).success).toBe(false)
    expect(organizationBrandingUpdateSchema.safeParse({
      logoDataUrl: 'https://example.test/logo.png',
    }).success).toBe(false)
    expect(organizationBrandingUpdateSchema.safeParse({}).success).toBe(false)
  })

  it('rejects logos above the storage limit and unexpected fields', () => {
    expect(organizationBrandingUpdateSchema.safeParse({
      logoDataUrl: `data:image/webp;base64,${'A'.repeat(400_001)}`,
    }).success).toBe(false)
    expect(organizationBrandingUpdateSchema.safeParse({
      logoShape: 'circle',
      organizationId: 'another-organization',
    }).success).toBe(false)
  })
})

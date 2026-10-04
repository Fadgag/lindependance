import { describe, expect, it } from 'vitest'
import { organizationBrandingUpdateSchema } from '@/domain/branding/logoSettings'

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

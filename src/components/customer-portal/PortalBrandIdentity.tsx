import Image from 'next/image'
import {
  getPortalLogoSizeForViewport,
  PORTAL_BRAND_COLORS,
  type PortalAppearance,
  type PortalNameFont,
  type PortalNameWeight,
} from '@/domain/branding/logoSettings'

const PORTAL_FONT_FAMILIES: Record<PortalNameFont, string> = {
  manrope: 'var(--font-manrope), sans-serif',
  notoSerif: 'var(--font-noto-serif), serif',
  rounded: 'ui-rounded, system-ui, sans-serif',
}

const PORTAL_FONT_WEIGHTS: Record<PortalNameWeight, number> = {
  normal: 400,
  semibold: 600,
  bold: 700,
}

type PortalBrandIdentityProps = {
  organizationName: string
  branding: PortalAppearance
  viewport?: 'mobile' | 'desktop'
}

export default function PortalBrandIdentity({
  organizationName,
  branding,
  viewport,
}: PortalBrandIdentityProps) {
  const logoSize = viewport
    ? getPortalLogoSizeForViewport(branding.portalLogoSize, viewport)
    : branding.portalLogoSize
  const mobileFontSize = Math.max(14, Math.round(branding.portalNameSize * 0.85))

  return (
    <div
      className="flex min-w-0 items-center gap-3"
      data-testid="portal-brand-preview"
      data-viewport={viewport ?? 'responsive'}
      data-logo-size={logoSize}
    >
      {branding.logoDataUrl && (
        <span
          role="img"
          aria-label={`Logo de ${organizationName}`}
          className={`inline-flex shrink-0 overflow-hidden ${
            branding.logoShape === 'circle' ? 'rounded-full' : 'rounded-none'
          }`}
        >
          <Image
            src={branding.logoDataUrl}
            alt=""
            width={logoSize}
            height={logoSize}
            unoptimized
            className="h-auto w-auto max-w-[128px] object-cover md:max-w-[160px]"
          />
        </span>
      )}
      <span
        title={organizationName}
        className="min-w-0 flex-1 truncate leading-tight"
        style={{
          color: PORTAL_BRAND_COLORS[branding.portalNameColor].hex,
          fontFamily: PORTAL_FONT_FAMILIES[branding.portalNameFont],
          fontSize: viewport === 'mobile'
            ? `${mobileFontSize}px`
            : viewport === 'desktop'
              ? `${branding.portalNameSize}px`
              : `clamp(14px, 5vw, ${branding.portalNameSize}px)`,
          fontWeight: PORTAL_FONT_WEIGHTS[branding.portalNameWeight],
          textAlign: branding.portalNameAlignment,
        }}
      >
        {organizationName}
      </span>
    </div>
  )
}

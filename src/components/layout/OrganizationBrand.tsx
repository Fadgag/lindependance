'use client'

import Image from 'next/image'
import { useOrganizationBranding } from '@/hooks/useOrganizationBranding'
import type { LogoShape } from '@/domain/branding/logoSettings'

type OrganizationBrandProps = {
  variant: 'sidebar' | 'mobile'
}

function logoShapeClass(shape: LogoShape): string {
  return shape === 'circle' ? 'rounded-full' : 'rounded-none'
}

export default function OrganizationBrand({ variant }: OrganizationBrandProps) {
  const branding = useOrganizationBranding()

  if (branding.logoDataUrl) {
    const size = variant === 'sidebar' ? 48 : 32
    const sizeClass = variant === 'sidebar' ? 'size-12' : 'size-8'
    return (
      <span
        role="img"
        aria-label="Logo de l’organisation"
        className={`inline-flex ${sizeClass} shrink-0 overflow-hidden align-middle ${logoShapeClass(branding.logoShape)}`}
      >
        <Image
          src={branding.logoDataUrl}
          alt=""
          width={size}
          height={size}
          unoptimized
          className="h-full w-full object-cover"
        />
      </span>
    )
  }

  if (variant === 'mobile') {
    return (
      <span className="font-serif text-lg">
        Atelier<span className="text-[var(--studio-primary)]">.</span>
      </span>
    )
  }

  return (
    <span className="block">
      <span className="block font-serif text-3xl tracking-tight text-(--studio-text)">
        Atelier<span className="text-(--studio-primary)">.</span>
      </span>
      <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.3em] text-(--studio-muted)">
        Studio Coiffure
      </span>
    </span>
  )
}

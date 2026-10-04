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
      <span className={`inline-flex min-w-0 items-center gap-3 ${variant === 'sidebar' ? 'max-w-52' : 'max-w-60'}`}>
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
        {branding.showNameWithLogo && (
          <span
            title={branding.organizationName}
            className={`truncate font-serif tracking-tight text-(--studio-text) ${
              variant === 'sidebar' ? 'max-w-32 text-lg' : 'max-w-40 text-lg'
            }`}
          >
            {branding.organizationName}
          </span>
        )}
      </span>
    )
  }

  return (
    <span
      title={branding.organizationName}
      className={`truncate font-serif tracking-tight text-(--studio-text) ${
        variant === 'sidebar' ? 'max-w-52 text-2xl' : 'max-w-60 text-lg'
      }`}
    >
      {branding.organizationName}
    </span>
  )
}

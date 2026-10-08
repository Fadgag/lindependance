'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { useOrganizationBranding } from '@/hooks/useOrganizationBranding'
import {
  getOrganizationLogoSizeForViewport,
  type LogoShape,
} from '@/domain/branding/logoSettings'
import { shouldStackOrganizationBrand } from './organizationBrandLayout'

type OrganizationBrandProps = {
  variant: 'sidebar' | 'mobile'
}

function logoShapeClass(shape: LogoShape): string {
  return shape === 'circle' ? 'rounded-full' : 'rounded-none'
}

const HORIZONTAL_GAP = 12

export default function OrganizationBrand({ variant }: OrganizationBrandProps) {
  const branding = useOrganizationBranding()
  const brandRef = useRef<HTMLSpanElement>(null)
  const titleMeasureRef = useRef<HTMLSpanElement>(null)
  const logoRef = useRef<HTMLSpanElement>(null)
  const [stacked, setStacked] = useState(true)

  useEffect(() => {
    const brand = brandRef.current
    const titleMeasure = titleMeasureRef.current
    const logo = logoRef.current
    if (!branding.logoDataUrl || !branding.showNameWithLogo || !brand || !titleMeasure || !logo) {
      return
    }

    const measureLayout = () => {
      const availableWidth = brand.clientWidth
      const titleWidth = titleMeasure.getBoundingClientRect().width
      const logoWidth = logo.getBoundingClientRect().width
      setStacked(shouldStackOrganizationBrand(availableWidth, titleWidth, logoWidth, HORIZONTAL_GAP))
    }

    measureLayout()
    const observer = new ResizeObserver(measureLayout)
    observer.observe(brand)
    observer.observe(titleMeasure)
    return () => observer.disconnect()
  }, [
    branding.logoDataUrl,
    branding.portalLogoSize,
    branding.organizationName,
    branding.showNameWithLogo,
    variant,
  ])

  if (branding.logoDataUrl) {
    const pixels = getOrganizationLogoSizeForViewport(branding.portalLogoSize, variant)
    return (
      <span
        ref={brandRef}
        className={`relative flex w-full min-w-0 ${variant === 'sidebar' ? 'max-w-52' : 'max-w-60'} ${
          stacked && branding.showNameWithLogo ? 'flex-col items-center gap-1' : 'flex-row items-center gap-3'
        }`}
      >
        {branding.showNameWithLogo && (
          <>
            <span
              title={branding.organizationName}
              className={`min-w-0 truncate font-serif tracking-tight text-(--studio-text) ${
                stacked ? 'order-2 w-full text-center text-lg' : 'order-2 flex-1 text-right text-lg'
              }`}
            >
              {branding.organizationName}
            </span>
            <span
              ref={titleMeasureRef}
              aria-hidden="true"
              className="pointer-events-none absolute w-max whitespace-nowrap font-serif text-lg tracking-tight invisible"
            >
              {branding.organizationName}
            </span>
          </>
        )}
        <span
          role="img"
          aria-label="Logo de l’organisation"
          ref={logoRef}
          className={`inline-flex order-1 shrink-0 overflow-hidden align-middle ${logoShapeClass(branding.logoShape)}`}
          style={{ width: pixels, height: pixels }}
        >
          <Image
            src={branding.logoDataUrl}
            alt=""
            width={pixels}
            height={pixels}
            unoptimized
            className="h-full w-full object-cover"
          />
        </span>
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

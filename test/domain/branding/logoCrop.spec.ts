import { describe, expect, it } from 'vitest'
import { createSquareLogoCropRegion } from '@/domain/branding/logoCrop'

describe('createSquareLogoCropRegion', () => {
  it('centers a square crop over portrait and landscape images', () => {
    expect(createSquareLogoCropRegion({
      imageWidth: 400,
      imageHeight: 800,
      zoom: 1,
      centerX: 0.5,
      centerY: 0.5,
    })).toEqual({ x: 0, y: 200, size: 400 })

    expect(createSquareLogoCropRegion({
      imageWidth: 800,
      imageHeight: 400,
      zoom: 1,
      centerX: 0.5,
      centerY: 0.5,
    })).toEqual({ x: 200, y: 0, size: 400 })
  })

  it('clamps panning to the image bounds and constrains zoom', () => {
    expect(createSquareLogoCropRegion({
      imageWidth: 800,
      imageHeight: 400,
      zoom: 2,
      centerX: 1,
      centerY: 0,
    })).toEqual({ x: 600, y: 0, size: 200 })

    expect(createSquareLogoCropRegion({
      imageWidth: 800,
      imageHeight: 400,
      zoom: 20,
      centerX: 0.5,
      centerY: 0.5,
    })).toEqual({ x: 350, y: 150, size: 100 })
  })

  it('rejects invalid image dimensions and non-finite crop positions', () => {
    expect(() => createSquareLogoCropRegion({
      imageWidth: 0,
      imageHeight: 400,
      zoom: 1,
      centerX: 0.5,
      centerY: 0.5,
    })).toThrow('Dimensions d’image invalides.')
    expect(() => createSquareLogoCropRegion({
      imageWidth: 400,
      imageHeight: 400,
      zoom: 1,
      centerX: Number.NaN,
      centerY: 0.5,
    })).toThrow('Position de recadrage invalide.')
  })
})

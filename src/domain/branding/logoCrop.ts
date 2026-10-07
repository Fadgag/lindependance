export interface SquareLogoCropRegion {
  x: number
  y: number
  size: number
}

export interface SquareLogoCropInput {
  imageWidth: number
  imageHeight: number
  zoom: number
  centerX: number
  centerY: number
}

const MIN_ZOOM = 1
const MAX_ZOOM = 4

export function createSquareLogoCropRegion({
  imageWidth,
  imageHeight,
  zoom,
  centerX,
  centerY,
}: SquareLogoCropInput): SquareLogoCropRegion {
  if (!Number.isFinite(imageWidth) || !Number.isFinite(imageHeight) || imageWidth <= 0 || imageHeight <= 0) {
    throw new Error('Dimensions d’image invalides.')
  }
  if (!Number.isFinite(centerX) || !Number.isFinite(centerY)) {
    throw new Error('Position de recadrage invalide.')
  }

  const boundedZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
  const size = Math.min(imageWidth, imageHeight) / boundedZoom
  const x = Math.max(0, Math.min(imageWidth - size, centerX * imageWidth - size / 2))
  const y = Math.max(0, Math.min(imageHeight - size, centerY * imageHeight - size / 2))

  return { x, y, size }
}

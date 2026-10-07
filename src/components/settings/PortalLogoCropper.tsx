'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { useEffect, useRef, useState } from 'react'
import { createSquareLogoCropRegion } from '@/domain/branding/logoCrop'
import { MAX_LOGO_DATA_URL_LENGTH } from '@/domain/branding/logoSettings'

type PortalLogoCropperProps = {
  file: File
  onConfirm: (logoDataUrl: string) => void
  onCancel: () => void
}

type CropPosition = {
  x: number
  y: number
}

type PointerPosition = {
  x: number
  y: number
}

function createCroppedLogo(
  bitmap: ImageBitmap,
  position: CropPosition,
  zoom: number,
): string {
  const region = createSquareLogoCropRegion({
    imageWidth: bitmap.width,
    imageHeight: bitmap.height,
    zoom,
    centerX: position.x,
    centerY: position.y,
  })

  for (const resolution of [512, 384, 256]) {
    const canvas = document.createElement('canvas')
    canvas.width = resolution
    canvas.height = resolution
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Impossible de préparer le logo.')
    context.drawImage(
      bitmap,
      region.x,
      region.y,
      region.size,
      region.size,
      0,
      0,
      resolution,
      resolution,
    )

    const logoDataUrl = canvas.toDataURL('image/webp', 0.82)
    if (logoDataUrl.length <= MAX_LOGO_DATA_URL_LENGTH) return logoDataUrl
  }

  throw new Error('Cette image reste trop volumineuse après optimisation.')
}

export default function PortalLogoCropper({
  file,
  onConfirm,
  onCancel,
}: PortalLogoCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bitmapRef = useRef<ImageBitmap | null>(null)
  const pointerRef = useRef<PointerPosition | null>(null)
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null)
  const [position, setPosition] = useState<CropPosition>({ x: 0.5, y: 0.5 })
  const [zoom, setZoom] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void createImageBitmap(file)
      .then((bitmap) => {
        if (!active) {
          bitmap.close()
          return
        }
        bitmapRef.current = bitmap
        setImageSize({ width: bitmap.width, height: bitmap.height })
        setPosition({ x: 0.5, y: 0.5 })
        setZoom(1)
        setLoading(false)
      })
      .catch(() => {
        if (active) {
          setError('Impossible de lire cette image. Choisissez un autre fichier.')
          setLoading(false)
        }
      })

    return () => {
      active = false
      bitmapRef.current?.close()
      bitmapRef.current = null
    }
  }, [file])

  useEffect(() => {
    const canvas = canvasRef.current
    const bitmap = bitmapRef.current
    if (!canvas || !bitmap) return

    const context = canvas.getContext('2d')
    if (!context) return
    const region = createSquareLogoCropRegion({
      imageWidth: bitmap.width,
      imageHeight: bitmap.height,
      zoom,
      centerX: position.x,
      centerY: position.y,
    })
    context.drawImage(
      bitmap,
      region.x,
      region.y,
      region.size,
      region.size,
      0,
      0,
      canvas.width,
      canvas.height,
    )
  }, [imageSize, position, zoom])

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    pointerRef.current = { x: event.clientX, y: event.clientY }
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const previousPointer = pointerRef.current
    const bitmap = bitmapRef.current
    const canvas = canvasRef.current
    if (!previousPointer || !bitmap || !canvas || event.buttons === 0) return

    const bounds = canvas.getBoundingClientRect()
    if (bounds.width === 0 || bounds.height === 0) return
    const region = createSquareLogoCropRegion({
      imageWidth: bitmap.width,
      imageHeight: bitmap.height,
      zoom,
      centerX: position.x,
      centerY: position.y,
    })
    const deltaX = event.clientX - previousPointer.x
    const deltaY = event.clientY - previousPointer.y
    setPosition((current) => ({
      x: Math.max(0, Math.min(1, current.x - deltaX / bounds.width * region.size / bitmap.width)),
      y: Math.max(0, Math.min(1, current.y - deltaY / bounds.height * region.size / bitmap.height)),
    }))
    pointerRef.current = { x: event.clientX, y: event.clientY }
  }

  function handlePointerUp() {
    pointerRef.current = null
  }

  function confirmCrop() {
    const bitmap = bitmapRef.current
    if (!bitmap) return

    setError('')
    try {
      onConfirm(createCroppedLogo(bitmap, position, zoom))
    } catch (cropError: unknown) {
      setError(cropError instanceof Error ? cropError.message : 'Impossible de préparer le logo.')
    }
  }

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onCancel() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <Dialog.Content className="fixed inset-0 z-[51] flex items-center justify-center p-4 focus:outline-none">
          <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <Dialog.Title className="text-lg font-semibold text-gray-900">
              Recadrer le logo
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-gray-600">
              Déplacez l’image dans le cadre carré et ajustez le zoom.
            </Dialog.Description>
            <div className="mx-auto mt-5 size-72 max-h-[70vw] max-w-[70vw] overflow-hidden rounded-lg border border-gray-300">
              <canvas
                ref={canvasRef}
                width={288}
                height={288}
                aria-label="Aperçu du recadrage du logo"
                className="size-full touch-none cursor-move"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              />
            </div>
            {loading && <p className="mt-3 text-sm text-gray-500">Chargement de l’image…</p>}
            {imageSize && (
              <label className="mt-5 block text-sm font-medium text-gray-700">
                Zoom du logo
                <input
                  aria-label="Zoom du logo"
                  type="range"
                  min="1"
                  max="4"
                  step="0.1"
                  value={zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                  className="mt-2 block w-full accent-indigo-600"
                />
              </label>
            )}
            {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmCrop}
                disabled={loading || !imageSize}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Utiliser ce recadrage
              </button>
            </div>
          </section>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

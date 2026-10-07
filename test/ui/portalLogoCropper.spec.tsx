import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import PortalLogoCropper from '@/components/settings/PortalLogoCropper'

function mockCanvasContext() {
  // RAISON: jsdom has no 2D canvas; the cropper tests use only drawImage.
  const drawImage = vi.fn()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ({
    drawImage,
  } as never))
  return drawImage
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('PortalLogoCropper', () => {
  it('lets the user zoom and confirms only the cropped logo', async () => {
    const file = new File(['image'], 'logo.png', { type: 'image/png' })
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({
      width: 800,
      height: 400,
      close: vi.fn(),
    }))
    const drawImage = mockCanvasContext()
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/webp;base64,AA==')

    render(<PortalLogoCropper file={file} onConfirm={onConfirm} onCancel={onCancel} />)

    expect(await screen.findByRole('dialog', { name: 'Recadrer le logo' })).toBeInTheDocument()
    const canvas = screen.getByLabelText('Aperçu du recadrage du logo')
    vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 0, 288, 288),
    )
    await waitFor(() => expect(drawImage).toHaveBeenCalled())
    const drawsBeforeDrag = drawImage.mock.calls.length
    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 144 })
    fireEvent.pointerMove(canvas, { clientX: 150, clientY: 144, buttons: 1 })
    await waitFor(() => expect(drawImage.mock.calls.length).toBeGreaterThan(drawsBeforeDrag))

    fireEvent.change(screen.getByRole('slider', { name: 'Zoom du logo' }), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Utiliser ce recadrage' }))

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith('data:image/webp;base64,AA==')
    })
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('allows canceling without confirming a replacement logo', async () => {
    const file = new File(['image'], 'logo.png', { type: 'image/png' })
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({
      width: 400,
      height: 400,
      close: vi.fn(),
    }))
    mockCanvasContext()

    render(<PortalLogoCropper file={file} onConfirm={onConfirm} onCancel={onCancel} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Annuler' }))

    expect(onCancel).toHaveBeenCalledOnce()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('cancels without saving when Escape is pressed', async () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({
      width: 400,
      height: 400,
      close: vi.fn(),
    }))
    mockCanvasContext()

    render(<PortalLogoCropper
      file={new File(['image'], 'logo.png', { type: 'image/png' })}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />)
    const dialog = await screen.findByRole('dialog', { name: 'Recadrer le logo' })
    fireEvent.keyDown(dialog, { key: 'Escape' })

    await waitFor(() => expect(onCancel).toHaveBeenCalledOnce())
    expect(onConfirm).not.toHaveBeenCalled()
  })
})

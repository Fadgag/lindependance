import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
// jest-dom matchers are loaded via test/setup.ts (setupFiles in vitest.config.ts)
import FloatingActionButton from '@/components/ui/FloatingActionButton'

describe('FloatingActionButton', () => {
  it('renders and is clickable', () => {
    const onClick = vi.fn()
    const { getByTestId } = render(<FloatingActionButton onClickAction={onClick} ariaLabel="Nouveau rendez-vous" />)
    const btn = getByTestId('floating-quick-rdv')
    expect(btn).toBeInTheDocument()
    expect(btn).toHaveAttribute('aria-label', 'Nouveau rendez-vous')
    // simulate click
    fireEvent.click(btn)
    expect(onClick).toHaveBeenCalled()
  })

  it('a un fallback backgroundColor inline (#C5908E)', () => {
    const { getByTestId } = render(<FloatingActionButton ariaLabel="Test" />)
    const btn = getByTestId('floating-quick-rdv')
    // Le style inline garantit la couleur même si Tailwind v4 ne génère pas bg-atelier-primary
    expect(btn).toHaveStyle({ backgroundColor: 'var(--color-atelier-primary, #C5908E)' })
  })

  it('a un z-index maximal et pointer-events:auto', () => {
    const { getByTestId } = render(<FloatingActionButton ariaLabel="Test" />)
    const btn = getByTestId('floating-quick-rdv')
    expect(btn).toHaveStyle({ zIndex: '2147483647', pointerEvents: 'auto' })
  })
})


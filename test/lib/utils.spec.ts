import { describe, it, expect } from 'vitest'
import { cn, isAbortError } from '../../src/lib/utils'

// ===========================================================================
//  cn — class name joiner
// ===========================================================================

describe('cn', () => {
  it('joint plusieurs classes valides', () => {
    expect(cn('foo', 'bar', 'baz')).toBe('foo bar baz')
  })

  it('filtre les valeurs falsy (null, undefined, false, chaîne vide)', () => {
    expect(cn('a', null, undefined, false, '', 'b')).toBe('a b')
  })

  it('retourne une chaîne vide si tout est falsy', () => {
    expect(cn(null, false, undefined)).toBe('')
  })

  it('accepte des nombres', () => {
    expect(cn('text', 0, 1)).toBe('text 1')
  })

  it('fonctionne avec un seul argument', () => {
    expect(cn('solo')).toBe('solo')
  })
})

// ===========================================================================
//  isAbortError
// ===========================================================================

describe('isAbortError', () => {
  it('retourne true pour une DOMException AbortError', () => {
    const err = new DOMException('User aborted', 'AbortError')
    expect(isAbortError(err)).toBe(true)
  })

  it('retourne true pour un objet { name: "AbortError" }', () => {
    expect(isAbortError({ name: 'AbortError' })).toBe(true)
  })

  it('retourne false pour un Error standard', () => {
    expect(isAbortError(new Error('not abort'))).toBe(false)
  })

  it('retourne false pour null', () => {
    expect(isAbortError(null)).toBe(false)
  })

  it('retourne false pour une string', () => {
    expect(isAbortError('AbortError')).toBe(false)
  })

  it('retourne false pour un objet sans champ name', () => {
    expect(isAbortError({ code: 20 })).toBe(false)
  })
})


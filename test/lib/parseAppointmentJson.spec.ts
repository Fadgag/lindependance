import { describe, it, expect } from 'vitest'
import { parseJsonField } from '../../src/lib/parseAppointmentJson'

type Item = { id: number; name: string }

describe('parseJsonField', () => {
  it('retourne [] pour null', () => {
    expect(parseJsonField(null)).toEqual([])
  })

  it('retourne [] pour undefined', () => {
    expect(parseJsonField(undefined)).toEqual([])
  })

  it('retourne [] pour une chaîne vide', () => {
    expect(parseJsonField('')).toEqual([])
  })

  it('parse un tableau JSON valide', () => {
    const input = JSON.stringify([{ id: 1, name: 'Alpha' }, { id: 2, name: 'Beta' }])
    expect(parseJsonField<Item>(input)).toEqual([
      { id: 1, name: 'Alpha' },
      { id: 2, name: 'Beta' },
    ])
  })

  it('retourne [] si le JSON est un objet (pas un tableau)', () => {
    expect(parseJsonField('{"key": "value"}')).toEqual([])
  })

  it('retourne [] si le JSON est un scalaire (nombre)', () => {
    expect(parseJsonField('42')).toEqual([])
  })

  it('retourne [] si le JSON est invalide', () => {
    expect(parseJsonField('not-valid-json{{')).toEqual([])
  })

  it('retourne [] pour un tableau vide JSON', () => {
    expect(parseJsonField('[]')).toEqual([])
  })
})


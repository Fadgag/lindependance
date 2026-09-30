import { describe, expect, it } from 'vitest'
import {
  buildAvailableSlots,
  getLocalDateForInstant,
  getUtcRangeForLocalDay,
  resolvePortalStaffSelection,
  shouldShowStaffPicker,
} from '@/domain/customer-portal/scheduling'

const STAFF_A = 'staff-a'
const STAFF_B = 'staff-b'

describe('shouldShowStaffPicker', () => {
  it('masque le sélecteur pour zéro ou un praticien', () => {
    expect(shouldShowStaffPicker(0)).toBe(false)
    expect(shouldShowStaffPicker(1)).toBe(false)
  })

  describe('resolvePortalStaffSelection', () => {
    it('automatically selects the only practitioner and requires a choice for several', () => {
      expect(resolvePortalStaffSelection([STAFF_A])).toEqual({ status: 'selected', staffId: STAFF_A })
      expect(resolvePortalStaffSelection([STAFF_A, STAFF_B])).toEqual({ status: 'required' })
      expect(resolvePortalStaffSelection([])).toEqual({ status: 'unavailable' })
    })

    it('rejects a forged practitioner id', () => {
      expect(resolvePortalStaffSelection([STAFF_A, STAFF_B], 'staff-other')).toEqual({ status: 'invalid' })
      expect(resolvePortalStaffSelection([STAFF_A], STAFF_B)).toEqual({ status: 'invalid' })
    })
  })

  it('affiche le sélecteur lorsque plusieurs praticiens sont disponibles', () => {
    expect(shouldShowStaffPicker(2)).toBe(true)
  })
})

describe('buildAvailableSlots', () => {
  const defaults = {
    date: '2026-01-15',
    timezone: 'Europe/Paris',
    openingTime: '09:00',
    closingTime: '12:00',
    durationMinutes: 60,
    slotIntervalMinutes: 30,
    staffId: STAFF_A,
    staffIds: [STAFF_A],
    appointments: [],
    unavailabilities: [],
    now: new Date('2026-01-15T07:00:00.000Z'),
  }

  it('calcule la fin depuis la durée du service et respecte les heures locales', () => {
    const slots = buildAvailableSlots(defaults)

    expect(slots).toEqual([
      { start: '2026-01-15T08:00:00.000Z', end: '2026-01-15T09:00:00.000Z' },
      { start: '2026-01-15T08:30:00.000Z', end: '2026-01-15T09:30:00.000Z' },
      { start: '2026-01-15T09:00:00.000Z', end: '2026-01-15T10:00:00.000Z' },
      { start: '2026-01-15T09:30:00.000Z', end: '2026-01-15T10:30:00.000Z' },
      { start: '2026-01-15T10:00:00.000Z', end: '2026-01-15T11:00:00.000Z' },
    ])
  })

  describe('customer portal timezone helpers', () => {
    it('uses the actual local-day duration across a daylight-saving transition', () => {
      expect(getUtcRangeForLocalDay('2026-03-29', 'Europe/Paris')).toEqual({
        start: new Date('2026-03-28T23:00:00.000Z'),
        end: new Date('2026-03-29T22:00:00.000Z'),
      })
    })

    it('returns the organization-local date for a persisted instant', () => {
      expect(getLocalDateForInstant(new Date('2026-10-01T08:00:00.000Z'), 'Europe/Paris'))
        .toBe('2026-10-01')
    })
  })

  it('bloque les rendez-vous actifs du praticien et les indisponibilités globales', () => {
    const slots = buildAvailableSlots({
      ...defaults,
      appointments: [
        {
          startTime: new Date('2026-01-15T08:00:00.000Z'),
          endTime: new Date('2026-01-15T08:30:00.000Z'),
          staffId: STAFF_A,
          status: 'CONFIRMED',
        },
        {
          startTime: new Date('2026-01-15T09:00:00.000Z'),
          endTime: new Date('2026-01-15T10:00:00.000Z'),
          staffId: STAFF_A,
          status: 'CANCELLED',
        },
      ],
      unavailabilities: [
        {
          startTime: new Date('2026-01-15T09:30:00.000Z'),
          endTime: new Date('2026-01-15T10:00:00.000Z'),
        },
      ],
    })

    expect(slots).toEqual([
      { start: '2026-01-15T08:30:00.000Z', end: '2026-01-15T09:30:00.000Z' },
      { start: '2026-01-15T10:00:00.000Z', end: '2026-01-15T11:00:00.000Z' },
    ])
  })

  it('ne bloque pas un rendez-vous d’un autre praticien', () => {
    const slots = buildAvailableSlots({
      ...defaults,
      staffIds: [STAFF_A, STAFF_B],
      appointments: [{
        startTime: new Date('2026-01-15T08:00:00.000Z'),
        endTime: new Date('2026-01-15T09:00:00.000Z'),
        staffId: STAFF_B,
        status: 'CONFIRMED',
      }],
    })

    expect(slots[0]).toEqual({
      start: '2026-01-15T08:00:00.000Z',
      end: '2026-01-15T09:00:00.000Z',
    })
  })

  it('ignore les heures locales inexistantes au passage à l’heure d’été', () => {
    const slots = buildAvailableSlots({
      ...defaults,
      date: '2026-03-29',
      openingTime: '02:00',
      closingTime: '04:00',
      durationMinutes: 30,
      now: new Date('2026-03-29T00:00:00.000Z'),
    })

    expect(slots[0]).toEqual({
      start: '2026-03-29T01:00:00.000Z',
      end: '2026-03-29T01:30:00.000Z',
    })
  })
})

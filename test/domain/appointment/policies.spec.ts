import { describe, it, expect } from 'vitest'
import {
  canDeleteAppointment,
  canCancelPortalAppointment,
  isAppointmentCancelled,
  hasSchedulingConflict,
  findFirstSchedulingConflict,
  hasCustomerSchedulingConflict,
} from '@/domain/appointment/policies'

describe('isAppointmentCancelled', () => {
  it('identifies cancelled appointments', () => {
    expect(isAppointmentCancelled({ status: 'CANCELLED' })).toBe(true)
    expect(isAppointmentCancelled({ status: 'CONFIRMED' })).toBe(false)
  })
})

describe('canDeleteAppointment', () => {
  it('autorise la suppression d’un RDV confirmé non payé', () => {
    expect(canDeleteAppointment({ status: 'CONFIRMED', finalPrice: null })).toBe(true)
  })

  it('refuse la suppression d’un RDV au statut PAID', () => {
    expect(canDeleteAppointment({ status: 'PAID', finalPrice: null })).toBe(false)
  })

  it('refuse la suppression d’un RDV au statut legacy PAYED', () => {
    expect(canDeleteAppointment({ status: 'PAYED', finalPrice: null })).toBe(false)
  })

  it('refuse la suppression dès qu’un finalPrice positif est enregistré, même si status est CONFIRMED', () => {
    expect(canDeleteAppointment({ status: 'CONFIRMED', finalPrice: 42 })).toBe(false)
  })

  it('autorise la suppression si finalPrice vaut 0', () => {
    expect(canDeleteAppointment({ status: 'CONFIRMED', finalPrice: 0 })).toBe(true)
  })
})

describe('canCancelPortalAppointment', () => {
  const now = new Date('2026-10-01T10:00:00.000Z')

  it('allows cancellation strictly more than 24 hours before the appointment', () => {
    expect(canCancelPortalAppointment(new Date('2026-10-02T10:00:00.001Z'), now, 'CONFIRMED')).toBe(true)
  })

  it('refuses cancellation exactly 24 hours before the appointment', () => {
    expect(canCancelPortalAppointment(new Date('2026-10-02T10:00:00.000Z'), now, 'CONFIRMED')).toBe(false)
  })

  it('refuses cancellation less than 24 hours before the appointment', () => {
    expect(canCancelPortalAppointment(new Date('2026-10-02T09:59:59.999Z'), now, 'CONFIRMED')).toBe(false)
  })

  it('refuses online cancellation for paid and legacy-paid appointments', () => {
    const appointmentStart = new Date('2026-10-03T10:00:00.000Z')

    expect(canCancelPortalAppointment(appointmentStart, now, 'PAID')).toBe(false)
    expect(canCancelPortalAppointment(appointmentStart, now, 'PAYED')).toBe(false)
  })

  it('refuses online cancellation when a positive final price indicates payment', () => {
    const appointmentStart = new Date('2026-10-03T10:00:00.000Z')

    expect(canCancelPortalAppointment(appointmentStart, now, 'CONFIRMED', 42)).toBe(false)
  })
})

describe('hasSchedulingConflict', () => {
  const slot = (start: string, end: string) => ({ startTime: new Date(start), endTime: new Date(end) })

  it('détecte un chevauchement partiel', () => {
    const candidate = slot('2026-01-01T10:00:00Z', '2026-01-01T11:00:00Z')
    const existing = slot('2026-01-01T10:30:00Z', '2026-01-01T11:30:00Z')
    expect(hasSchedulingConflict(candidate, existing)).toBe(true)
  })

  it('détecte un créneau existant totalement inclus dans le candidat', () => {
    const candidate = slot('2026-01-01T09:00:00Z', '2026-01-01T12:00:00Z')
    const existing = slot('2026-01-01T10:00:00Z', '2026-01-01T11:00:00Z')
    expect(hasSchedulingConflict(candidate, existing)).toBe(true)
  })

  it('ne détecte pas de conflit quand les créneaux se touchent juste aux bornes', () => {
    const candidate = slot('2026-01-01T09:00:00Z', '2026-01-01T10:00:00Z')
    const existing = slot('2026-01-01T10:00:00Z', '2026-01-01T11:00:00Z')
    expect(hasSchedulingConflict(candidate, existing)).toBe(false)
  })

  it('ne détecte pas de conflit pour des créneaux disjoints', () => {
    const candidate = slot('2026-01-01T09:00:00Z', '2026-01-01T10:00:00Z')
    const existing = slot('2026-01-01T11:00:00Z', '2026-01-01T12:00:00Z')
    expect(hasSchedulingConflict(candidate, existing)).toBe(false)
  })
})

describe('findFirstSchedulingConflict', () => {
  const slot = (start: string, end: string) => ({ startTime: new Date(start), endTime: new Date(end) })

  it('retourne le premier créneau en conflit', () => {
    const candidate = slot('2026-01-01T10:00:00Z', '2026-01-01T11:00:00Z')
    const existingSlots = [
      slot('2026-01-01T08:00:00Z', '2026-01-01T09:00:00Z'),
      slot('2026-01-01T10:30:00Z', '2026-01-01T11:30:00Z'),
    ]
    expect(findFirstSchedulingConflict(candidate, existingSlots)).toBe(existingSlots[1])
  })

  it('retourne undefined si aucun conflit', () => {
    const candidate = slot('2026-01-01T10:00:00Z', '2026-01-01T11:00:00Z')
    const existingSlots = [slot('2026-01-01T08:00:00Z', '2026-01-01T09:00:00Z')]
    expect(findFirstSchedulingConflict(candidate, existingSlots)).toBeUndefined()
  })
})

describe('hasCustomerSchedulingConflict', () => {
  const candidate = {
    startTime: new Date('2026-10-01T08:00:00.000Z'),
    endTime: new Date('2026-10-01T09:00:00.000Z'),
  }

  it('blocks an overlapping appointment for the same customer', () => {
    expect(hasCustomerSchedulingConflict(candidate, 'customer-1', [{
      ...candidate,
      customerId: 'customer-1',
    }])).toBe(true)
  })

  it('allows an overlapping appointment for a different customer', () => {
    expect(hasCustomerSchedulingConflict(candidate, 'customer-1', [{
      ...candidate,
      customerId: 'customer-2',
    }])).toBe(false)
  })
})

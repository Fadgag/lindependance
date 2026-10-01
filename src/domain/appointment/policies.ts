/**
 * Règles métier autour des rendez-vous : suppression et détection de conflit horaire.
 *
 * Fonctions pures : aucune dépendance à Next.js/Prisma. Testables en unitaire sans mock DB.
 * Utilisées par `src/app/api/appointments/route.ts` (orchestration HTTP + persistance).
 */

export interface AppointmentPaymentInfo {
  status?: string | null
  finalPrice?: number | null
}

/**
 * Un rendez-vous ne peut pas être supprimé s'il est marqué payé (status `PAID`/`PAYED`,
 * legacy) ou si un `finalPrice` positif a été enregistré (défense en profondeur,
 * indépendante du statut).
 */
export function canDeleteAppointment(appointment: AppointmentPaymentInfo): boolean {
  const isPaid = appointment.status === 'PAID'
    || appointment.status === 'PAYED'
    || (appointment.finalPrice ? Number(appointment.finalPrice) : 0) > 0
  return !isPaid
}

export interface TimeRange {
  startTime: Date
  endTime: Date
}

/**
 * Deux créneaux sont en conflit s'ils se chevauchent strictement, en excluant le simple
 * contact aux bornes (un RDV qui se termine à 10h et un autre qui commence à 10h ne sont
 * pas en conflit).
 */
export function hasSchedulingConflict(candidate: TimeRange, existing: TimeRange): boolean {
  return existing.startTime < candidate.endTime && existing.endTime > candidate.startTime
}

/**
 * Retourne true si le créneau candidat est en conflit avec au moins un créneau existant.
 */
export function findFirstSchedulingConflict<T extends TimeRange>(candidate: TimeRange, existingSlots: T[]): T | undefined {
  return existingSlots.find((slot) => hasSchedulingConflict(candidate, slot))
}

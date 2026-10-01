/**
 * Règle de crédit de séances pour les forfaits clients (`CustomerPackage.sessionsRemaining`).
 *
 * Fonctions pures : aucune dépendance à Next.js/Prisma. Testables en unitaire sans mock DB.
 *
 * Utilisation :
 * - `src/app/api/customers/[id]/packages/route.ts` (GET) filtre les forfaits utilisables
 *   avec `canConsumeSession`.
 * - `src/app/api/appointments/route.ts` (POST) décrémente `sessionsRemaining` via une
 *   opération Prisma atomique (`updateMany` avec garde `sessionsRemaining: { gt: 0 }`)
 *   qui reproduit intentionnellement cette même règle au niveau base de données : la
 *   concurrence (deux requêtes simultanées) impose que la garde reste atomique côté DB,
 *   un simple appel à `canConsumeSession` après un fetch séparé réintroduirait une race
 *   condition. `consumeSession` documente et teste le comportement attendu.
 */

export interface SessionCredit {
  sessionsRemaining: number
}

/** Un forfait ne peut être consommé (réservé/décrémenté) que s'il reste au moins une séance. */
export function canConsumeSession(pkg: SessionCredit): boolean {
  return pkg.sessionsRemaining > 0
}

/**
 * Calcule l'état du forfait après consommation d'une séance.
 * Lève une erreur si le forfait n'a plus de séance disponible — ne doit jamais être
 * appelée sans avoir vérifié `canConsumeSession` au préalable.
 */
export function consumeSession<T extends SessionCredit>(pkg: T): T {
  if (!canConsumeSession(pkg)) {
    throw new Error('Cannot consume a session: no sessions remaining')
  }
  return { ...pkg, sessionsRemaining: pkg.sessionsRemaining - 1 }
}

export function getSessionRefundAmount(): 1 {
  return 1
}

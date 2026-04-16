/**
 * Utilitaire : parse un champ JSON stocké en String? dans Prisma (ex: extras, soldProducts).
 * Retourne un tableau typé ou un tableau vide en cas d'erreur / valeur nulle.
 */
export function parseJsonField<T>(raw: string | null | undefined): T[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}


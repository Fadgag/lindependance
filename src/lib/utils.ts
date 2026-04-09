// Tiny utility to concatenate conditional class names — compatible with shadcn examples.
export function cn(...classes: Array<string | number | null | undefined | false>) {
  return classes.filter(Boolean).join(' ')
}

export function isAbortError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false
  const name = (err as Record<string, unknown>)['name']
  return typeof name === 'string' && name === 'AbortError'
}

// Note: apiErrorResponse is centralized in src/lib/api.ts — avoid duplicate definitions here.


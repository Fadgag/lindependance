import type { Customer } from '@/types/models'

/**
 * Client-side helper to fetch customers from the API.
 * Returns a typed array or throws on unexpected shape/error.
 */
export async function getCustomersClient(): Promise<Customer[]> {
  const res = await fetch('/api/customers', { credentials: 'include' })
  const payload = await res.json().catch(() => null)

  if (!res.ok) {
    const err = (payload && (payload.error || payload.message)) || 'Failed to fetch customers'
    throw new Error(String(err))
  }

  if (!Array.isArray(payload)) {
    throw new Error('Invalid customers payload')
  }

  // RAISON: we validated above that `payload` is an array (runtime check).
  // Casting to `Customer[]` is safe here because each element is expected to
  // follow the API contract; strict shape validation can be added later if needed.
  return payload as Customer[]
}

export default getCustomersClient


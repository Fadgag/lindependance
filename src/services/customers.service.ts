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

  return payload as Customer[]
}

export default getCustomersClient


import type { Service } from '@/types/models'

/**
 * Client-side helper to fetch services from the API.
 * Returns a typed array or throws on unexpected shape/error.
 */
export async function getServicesClient(): Promise<Service[]> {
  const res = await fetch('/api/services', { credentials: 'include' })
  const payload = await res.json().catch(() => null)

  if (!res.ok) {
    // forward error message when available
    const err = (payload && (payload.error || payload.message)) || 'Failed to fetch services'
    throw new Error(String(err))
  }

  if (!Array.isArray(payload)) {
    throw new Error('Invalid services payload')
  }

  // RAISON: runtime check above ensures `payload` is an array. We cast to
  // `Service[]` to satisfy the consumer; consider adding full schema validation
  // (zod) if stricter guarantees are required.
  return payload as Service[]
}

export default getServicesClient



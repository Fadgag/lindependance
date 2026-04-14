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

  return payload as Service[]
}

export default getServicesClient



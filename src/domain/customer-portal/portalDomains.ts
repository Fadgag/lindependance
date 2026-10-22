const hostnameLabelPattern = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)$/

export type PortalDomainMapping =
  | { status: 'unmapped' }
  | { status: 'mapped'; organizationSlug: string | null }

export function normalizePortalHostname(value: string): string | null {
  const hostname = value.trim().toLowerCase().replace(/\.$/, '')
  if (!hostname || hostname.length > 253) return null

  const labels = hostname.split('.')
  if (labels.some((label) => label.length > 63 || !hostnameLabelPattern.test(label))) {
    return null
  }

  return hostname
}

export function getPortalHostnameFromHeaders(headers: Pick<Headers, 'get'>): string | null {
  const forwardedHost = headers.get('x-forwarded-host')
  const rawHost = forwardedHost ? forwardedHost.split(',')[0]?.trim() : headers.get('host')
  if (!rawHost) return null

  try {
    const parsed = new URL(`http://${rawHost}`)
    if (parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) {
      return null
    }
    return normalizePortalHostname(parsed.hostname)
  } catch {
    return null
  }
}

const hostnameLabelPattern = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)$/
const organizationSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export type PortalDomainMapping =
  | { status: 'unmapped' }
  | { status: 'mapped'; organizationSlug: string }

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

export function resolvePortalDomainMapping(
  hostname: string | null,
  serializedMap: string | undefined,
): PortalDomainMapping {
  if (!serializedMap?.trim()) return { status: 'unmapped' }

  let parsed: unknown
  try {
    parsed = JSON.parse(serializedMap)
  } catch {
    throw new Error('CUSTOMER_PORTAL_DOMAIN_MAP doit contenir un objet JSON valide.')
  }

  if (!isJsonObject(parsed)) {
    throw new Error('CUSTOMER_PORTAL_DOMAIN_MAP doit contenir un objet JSON valide.')
  }

  const mappings = new Map<string, string>()
  for (const [configuredHostname, organizationSlug] of Object.entries(parsed)) {
    const normalizedHostname = normalizePortalHostname(configuredHostname)
    if (!normalizedHostname) {
      throw new Error('CUSTOMER_PORTAL_DOMAIN_MAP contient un domaine invalide.')
    }
    if (
      typeof organizationSlug !== 'string'
      || organizationSlug.length < 3
      || organizationSlug.length > 63
      || !organizationSlugPattern.test(organizationSlug)
    ) {
      throw new Error('CUSTOMER_PORTAL_DOMAIN_MAP contient un slug invalide.')
    }
    if (mappings.has(normalizedHostname)) {
      throw new Error('CUSTOMER_PORTAL_DOMAIN_MAP contient un domaine en double.')
    }
    mappings.set(normalizedHostname, organizationSlug)
  }

  const normalizedRequestHostname = hostname ? normalizePortalHostname(hostname) : null
  const organizationSlug = normalizedRequestHostname
    ? mappings.get(normalizedRequestHostname)
    : undefined
  return organizationSlug
    ? { status: 'mapped', organizationSlug }
    : { status: 'unmapped' }
}

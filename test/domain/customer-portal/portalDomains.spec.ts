import { describe, expect, it } from 'vitest'
import {
  getPortalHostnameFromHeaders,
  normalizePortalHostname,
} from '@/domain/customer-portal/portalDomains'

describe('customer portal hostnames', () => {
  it('normalizes valid hostnames and rejects URLs, paths, and malformed labels', () => {
    expect(normalizePortalHostname(' Testing.OsezLetre.fr. ')).toBe('testing.osezletre.fr')
    expect(normalizePortalHostname('https://testing.osezletre.fr')).toBeNull()
    expect(normalizePortalHostname('testing.osezletre.fr/path')).toBeNull()
    expect(normalizePortalHostname('testing..osezletre.fr')).toBeNull()
  })

  it('reads the public hostname from forwarded headers before the internal host', () => {
    expect(getPortalHostnameFromHeaders(new Headers({
      host: 'internal.example.net',
      'x-forwarded-host': 'Testing.OsezLetre.fr:443, internal.example.net',
    }))).toBe('testing.osezletre.fr')
    expect(getPortalHostnameFromHeaders(new Headers())).toBeNull()
    expect(getPortalHostnameFromHeaders(new Headers({
      host: 'invalid host header',
    }))).toBeNull()
  })
})

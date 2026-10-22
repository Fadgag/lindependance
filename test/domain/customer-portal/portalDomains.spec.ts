import { describe, expect, it } from 'vitest'
import {
  getPortalHostnameFromHeaders,
  normalizePortalHostname,
  resolvePortalDomainMapping,
} from '@/domain/customer-portal/portalDomains'

describe('customer portal domain mapping', () => {
  it('normalizes valid hostnames without accepting URLs or paths', () => {
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

  it('returns the configured salon slug for an exact hostname match', () => {
    expect(resolvePortalDomainMapping(
      'testing.osezletre.fr',
      '{"testing.osezletre.fr":"osezletre","testing.autre.fr":"autre-salon"}',
    )).toEqual({ status: 'mapped', organizationSlug: 'osezletre' })
    expect(resolvePortalDomainMapping(
      'unknown.example.fr',
      '{"testing.osezletre.fr":"osezletre"}',
    )).toEqual({ status: 'unmapped' })
    expect(resolvePortalDomainMapping('testing.osezletre.fr', undefined))
      .toEqual({ status: 'unmapped' })
  })

  it('rejects an invalid technical domain map instead of silently ignoring it', () => {
    expect(() => resolvePortalDomainMapping('testing.osezletre.fr', '{invalid'))
      .toThrow('CUSTOMER_PORTAL_DOMAIN_MAP doit contenir un objet JSON valide.')
    expect(() => resolvePortalDomainMapping(
      'testing.osezletre.fr',
      '{"https://testing.osezletre.fr":"osezletre"}',
    )).toThrow('CUSTOMER_PORTAL_DOMAIN_MAP contient un domaine invalide.')
    expect(() => resolvePortalDomainMapping(
      'testing.osezletre.fr',
      '{"testing.osezletre.fr":"invalid slug"}',
    )).toThrow('CUSTOMER_PORTAL_DOMAIN_MAP contient un slug invalide.')
  })
})

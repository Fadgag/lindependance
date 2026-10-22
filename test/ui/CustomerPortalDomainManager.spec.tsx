import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import CustomerPortalDomainManager from '@/components/test-admin/CustomerPortalDomainManager'

afterEach(() => {
  vi.unstubAllGlobals()
})

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const initialConfiguration = {
  domains: [{
    id: 'domain-1',
    hostname: 'testing.osezletre.fr',
    organizationId: 'org-1',
    organizationName: 'Osez l’Etre',
    organizationSlug: 'osezletre',
    portalAvailable: true,
  }],
  organizations: [{ id: 'org-1', name: 'Osez l’Etre', slug: 'osezletre' }],
}

describe('CustomerPortalDomainManager', () => {
  it('loads configured hostnames and active portal choices', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(initialConfiguration))
    vi.stubGlobal('fetch', fetchMock)

    render(<CustomerPortalDomainManager />)

    expect(await screen.findByText('testing.osezletre.fr')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /Osez l’Etre/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Supprimer testing.osezletre.fr' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/tech-admin/customer-portal-domains',
      expect.objectContaining({ cache: 'no-store' }),
    )
  })

  it('adds an association and refreshes the list', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ domains: [], organizations: initialConfiguration.organizations }))
      .mockResolvedValueOnce(response({
        id: 'domain-2',
        hostname: 'salon.example.fr',
      }, 201))
      .mockResolvedValueOnce(response({
        domains: [{
          id: 'domain-2',
          hostname: 'salon.example.fr',
          organizationId: 'org-1',
          organizationName: 'Osez l’Etre',
          organizationSlug: 'osezletre',
          portalAvailable: true,
        }],
        organizations: initialConfiguration.organizations,
      }))
    vi.stubGlobal('fetch', fetchMock)

    render(<CustomerPortalDomainManager />)
    await screen.findByText('Aucun domaine n’est configuré.')
    fireEvent.change(screen.getByLabelText('Nom de domaine'), {
      target: { value: 'salon.example.fr' },
    })
    fireEvent.change(screen.getByLabelText('Salon associé'), {
      target: { value: 'org-1' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter le domaine' }))

    expect(await screen.findByText('salon.example.fr')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/tech-admin/customer-portal-domains', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostname: 'salon.example.fr', organizationId: 'org-1' }),
    }))
  })

  it('removes an association and reports API errors', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(initialConfiguration))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(response({
        domains: [],
        organizations: initialConfiguration.organizations,
      }))
    vi.stubGlobal('fetch', fetchMock)

    render(<CustomerPortalDomainManager />)
    fireEvent.click(await screen.findByRole('button', {
      name: 'Supprimer testing.osezletre.fr',
    }))

    await screen.findByText('Aucun domaine n’est configuré.')
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/tech-admin/customer-portal-domains/domain-1',
      expect.objectContaining({ method: 'DELETE' }),
    )

    fetchMock.mockResolvedValueOnce(response({ error: 'Le domaine est déjà utilisé.' }, 409))
    fireEvent.change(screen.getByLabelText('Nom de domaine'), {
      target: { value: 'duplicate.example.fr' },
    })
    fireEvent.change(screen.getByLabelText('Salon associé'), {
      target: { value: 'org-1' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter le domaine' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Le domaine est déjà utilisé.')
  })
})

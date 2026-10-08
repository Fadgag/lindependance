'use client'

import { useTechAdminDomain } from './TechAdminDomainProvider'

export default function TechAdminDomainSelector() {
  const {
    isTechAdmin,
    organizations,
    selectedOrganizationIds,
    selectOrganizations,
    loading,
    error,
  } = useTechAdminDomain()

  if (!isTechAdmin) return null

  const selectionLabel = selectedOrganizationIds.length === 0
    ? 'Tous les domaines'
    : organizations
      .filter(({ id }) => selectedOrganizationIds.includes(id))
      .map(({ name }) => name)
      .join(', ')

  return (
    <div className="space-y-1 px-4">
      <details className="group text-sm">
        <summary className="cursor-pointer font-medium text-(--studio-text)">
          Domaines de travail : {selectionLabel}
        </summary>
        <fieldset className="mt-2 grid max-h-60 gap-2 overflow-y-auto rounded-lg border border-(--studio-border) bg-white p-3">
          <legend className="sr-only">Domaines de travail</legend>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              aria-label="Tous les domaines"
              checked={selectedOrganizationIds.length === 0}
              disabled={loading}
              onChange={() => selectOrganizations([])}
            />
            Tous les domaines
          </label>
          {organizations.map((organization) => (
            <label key={organization.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                aria-label={organization.name}
                checked={selectedOrganizationIds.includes(organization.id)}
                disabled={loading}
                onChange={(event) => selectOrganizations(
                  event.target.checked
                    ? [...selectedOrganizationIds, organization.id]
                    : selectedOrganizationIds.filter((id) => id !== organization.id),
                )}
              />
              {organization.name}
            </label>
          ))}
        </fieldset>
      </details>
      {loading && <p role="status" className="text-xs text-(--studio-muted)">Chargement des domaines…</p>}
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    </div>
  )
}

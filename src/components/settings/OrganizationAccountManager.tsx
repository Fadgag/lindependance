'use client'

import { useCallback, useState } from 'react'
import type { FormEvent } from 'react'
import { z } from 'zod'
import {
  CreateOrganizationAccountSchema,
  OrganizationAccountInvitationResponseSchema,
  OrganizationAccountsSchema,
  type OrganizationAccountRole,
} from '@/schemas/userAccounts'

type OrganizationAccount = z.infer<typeof OrganizationAccountsSchema>[number]

async function responseError(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json()
    const parsed = z.object({ error: z.string() }).safeParse(body)
    if (parsed.success) return parsed.data.error
  } catch {
    return `Erreur serveur (${response.status}).`
  }
  return `Erreur serveur (${response.status}).`
}

function AccountRow({
  account,
  actorId,
  onRefresh,
}: {
  account: OrganizationAccount
  actorId: string
  onRefresh: () => Promise<void>
}) {
  const [role, setRole] = useState<OrganizationAccountRole>(account.role)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState('')
  const isSelf = account.id === actorId

  async function updateAccount(method: 'PATCH' | 'DELETE') {
    setSaving(true)
    setError('')
    try {
      const response = await fetch(`/api/users/${encodeURIComponent(account.id)}`, {
        method,
        headers: method === 'PATCH' ? { 'Content-Type': 'application/json' } : undefined,
        body: method === 'PATCH' ? JSON.stringify({ role }) : undefined,
      })
      if (!response.ok) throw new Error(await responseError(response))
      setConfirmDelete(false)
      await onRefresh()
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'La modification du compte a échoué.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <article className="rounded-2xl border border-(--studio-border) bg-white p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="break-all font-semibold text-(--studio-text)">{account.email ?? 'Adresse e-mail indisponible'}</h3>
          {account.name && <p className="mt-1 text-sm text-(--studio-muted)">{account.name}</p>}
          <p className="mt-2 text-xs text-(--studio-muted)">
            {account.activationStatus === 'PENDING' ? 'En attente d’activation' : 'Compte activé'}
          </p>
        </div>
        {isSelf ? (
          <p className="text-sm text-(--studio-muted)">Votre compte ne peut pas être modifié ici.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor={`account-role-${account.id}`}>Rôle de {account.email}</label>
            <select
              id={`account-role-${account.id}`}
              value={role}
              onChange={(event) => setRole(event.target.value === 'ADMIN' ? 'ADMIN' : 'USER')}
              disabled={saving}
              className="rounded-xl border border-(--studio-border) px-3 py-2 text-sm"
            >
              <option value="USER">USER — compte staff</option>
              <option value="ADMIN">ADMIN — gestion du salon</option>
            </select>
            <button
              type="button"
              onClick={() => void updateAccount('PATCH')}
              disabled={saving || role === account.role}
              className="rounded-xl bg-(--studio-primary) px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Enregistrer
            </button>
          </div>
        )}
      </div>

      {!isSelf && (
        <div className="mt-4">
          {confirmDelete ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-red-800">Supprimer définitivement ce compte ?</p>
              <button
                type="button"
                onClick={() => void updateAccount('DELETE')}
                disabled={saving}
                className="rounded-xl bg-red-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Confirmer la suppression
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={saving}
                className="rounded-xl border border-(--studio-border) px-3 py-2 text-sm"
              >
                Annuler
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={saving}
              className="text-sm font-semibold text-red-700 hover:underline"
            >
              Supprimer ce compte
            </button>
          )}
        </div>
      )}
      {error && <p role="alert" className="mt-4 text-sm text-red-800">{error}</p>}
    </article>
  )
}

export default function OrganizationAccountManager({
  actorId,
  initialAccounts,
}: {
  actorId: string
  initialAccounts: OrganizationAccount[]
}) {
  const [accounts, setAccounts] = useState(initialAccounts)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<OrganizationAccountRole>('USER')
  const [confirmControlledEmail, setConfirmControlledEmail] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadAccounts = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/users', { cache: 'no-store' })
      if (!response.ok) throw new Error(await responseError(response))
      const body: unknown = await response.json()
      const parsed = OrganizationAccountsSchema.safeParse(body)
      if (!parsed.success) throw new Error('La liste des comptes reçue est invalide.')
      setAccounts(parsed.data)
      setError('')
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Impossible de charger les comptes.')
    } finally {
      setLoading(false)
    }
  }, [])

  async function inviteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setNotice('')
    const input = CreateOrganizationAccountSchema.safeParse({
      email,
      name: name.trim() || undefined,
      role,
      confirmControlledEmail,
    })
    if (!input.success) {
      setError('Vérifiez l’adresse e-mail et confirmez que vous contrôlez cette boîte.')
      setSubmitting(false)
      return
    }

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input.data),
      })
      if (!response.ok) throw new Error(await responseError(response))
      const body: unknown = await response.json()
      const parsed = OrganizationAccountInvitationResponseSchema.safeParse(body)
      if (!parsed.success) throw new Error('La réponse d’invitation reçue est invalide.')
      setNotice(parsed.data.invitation.sent
        ? `Invitation envoyée à ${parsed.data.account.email}. Le lien expire dans une heure.`
        : parsed.data.invitation.error ?? 'Le compte a été créé, mais l’invitation n’a pas été envoyée.')
      setEmail('')
      setName('')
      setRole('USER')
      setConfirmControlledEmail(false)
      await loadAccounts()
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Impossible d’inviter ce compte.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="space-y-8">
      <header>
        <h2 className="text-2xl font-bold text-slate-900">Comptes du salon</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Invitez des personnes, gérez leur rôle ou supprimez leur accès. Chaque compte reste limité à ce salon.
        </p>
      </header>

      <section className="max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <h3 className="text-lg font-bold text-slate-900">Inviter un compte</h3>
        <p className="mt-2 text-sm text-slate-600">La personne recevra un lien à usage unique pour définir son mot de passe.</p>
        <form onSubmit={inviteAccount} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="account-email" className="mb-2 block text-sm font-semibold text-slate-800">Adresse e-mail</label>
              <input
                id="account-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="account-name" className="mb-2 block text-sm font-semibold text-slate-800">Nom (facultatif)</label>
              <input
                id="account-name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
              />
            </div>
          </div>
          <div>
            <label htmlFor="new-account-role" className="mb-2 block text-sm font-semibold text-slate-800">Rôle du compte</label>
            <select
              id="new-account-role"
              value={role}
              onChange={(event) => setRole(event.target.value === 'ADMIN' ? 'ADMIN' : 'USER')}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
            >
              <option value="USER">USER — compte staff</option>
              <option value="ADMIN">ADMIN — gestion du salon</option>
            </select>
          </div>
          <label className="flex items-start gap-3 text-sm leading-6 text-slate-600">
            <input
              type="checkbox"
              checked={confirmControlledEmail}
              onChange={(event) => setConfirmControlledEmail(event.target.checked)}
              className="mt-1"
            />
            <span>Je confirme que cette adresse est contrôlée par la personne invitée et j’autorise l’envoi du lien.</span>
          </label>
          <button
            type="submit"
            disabled={submitting || !email.trim() || !confirmControlledEmail}
            className="rounded-2xl bg-(--studio-primary) px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Envoi en cours…' : 'Créer le compte et envoyer l’invitation'}
          </button>
        </form>
      </section>

      {error && <p role="alert" className="max-w-3xl rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="max-w-3xl rounded-xl bg-emerald-50 p-4 text-sm text-emerald-950">{notice}</p>}

      <section className="max-w-4xl space-y-4">
        <h3 className="text-lg font-bold text-slate-900">Comptes existants</h3>
        {loading ? (
          <p role="status" className="text-sm text-slate-600">Chargement des comptes…</p>
        ) : accounts.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">Aucun compte à afficher.</p>
        ) : (
          accounts.map((account) => (
            <AccountRow
              key={`${account.id}-${account.role}`}
              account={account}
              actorId={actorId}
              onRefresh={loadAccounts}
            />
          ))
        )}
      </section>
    </main>
  )
}

'use client'

import { useState, type FormEvent } from 'react'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import BaseModal from '@/components/ui/BaseModal'
import {
  IssueReportReporterContextSchema,
  type IssueReportReporterContext,
} from '@/schemas/issueReport'
import { getRecentClientIssueErrors } from '@/lib/clientIssueErrors'

export default function IssueReportLauncher() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isPortalAppointmentsPath = pathname.startsWith('/portail/') && pathname.endsWith('/mes-rdv')
  const isStaff = session?.user?.accountType === 'STAFF'
  const [open, setOpen] = useState(false)
  const [context, setContext] = useState<IssueReportReporterContext | null>(null)
  const [loadingContext, setLoadingContext] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [steps, setSteps] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  if (!isStaff && !isPortalAppointmentsPath) return null

  async function openReportForm() {
    setOpen(true)
    setError('')
    setSent(false)
    setContext(null)
    setLoadingContext(true)
    try {
      const response = await fetch('/api/issue-reports/context', { cache: 'no-store' })
      const body: unknown = await response.json()
      if (!response.ok) {
        const message = body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
          ? body.error
          : 'Connectez-vous pour envoyer un signalement.'
        setError(message)
        return
      }
      const parsed = IssueReportReporterContextSchema.safeParse(body)
      if (!parsed.success) {
        setError('Impossible de vérifier les informations de votre signalement.')
        return
      }
      setContext(parsed.data)
    } catch {
      setError('Impossible de vérifier les informations de votre signalement.')
    } finally {
      setLoadingContext(false)
    }
  }

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const response = await fetch('/api/issue-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title,
          description,
          steps,
          pathname,
          errors: getRecentClientIssueErrors(),
        }),
      })
      const body: unknown = await response.json()
      if (!response.ok) {
        const message = body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
          ? body.error
          : 'Impossible d’envoyer le signalement. Réessayez.'
        setError(message)
        return
      }
      setSent(true)
      setTitle('')
      setDescription('')
      setSteps('')
    } catch {
      setError('Impossible d’envoyer le signalement. Vérifiez votre connexion et réessayez.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void openReportForm()}
        className="fixed bottom-4 right-4 z-40 rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-slate-700"
      >
        Signaler un problème
      </button>
      <BaseModal isOpen={open} onClose={() => setOpen(false)} title="Signaler un problème" maxWidth="36rem">
            <section className="max-h-[70vh] overflow-y-auto">
            {loadingContext ? <p className="mt-4 text-sm text-slate-600">Vérification de votre accès…</p> : null}
            {error ? <p role="alert" className="mt-4 text-sm text-red-700">{error}</p> : null}
            {sent ? <p role="status" className="mt-4 text-sm text-green-800">Votre signalement a été envoyé à l’équipe technique.</p> : null}
            {context && !sent && (
              <>
                <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                  Nous transmettrons votre nom et votre adresse e-mail
                  {context.organizationName ? ' ainsi que le nom de votre salon' : ''}.
                  Votre titre, votre description et les étapes que vous saisirez seront également
                  transmis, ainsi que la page ouverte,
                  la date et l’heure, la version de l’application et jusqu’à cinq erreurs
                  techniques récentes expurgées. Le contenu saisi ailleurs dans l’application
                  et votre adresse IP ne seront pas transmis. Seuls les administrateurs
                  techniques pourront consulter ces informations. Les signalements sont
                  supprimés 90 jours après leur résolution. Évitez d’inclure des données
                  sensibles dans votre description.
                </p>
                <p className="mt-2 text-xs text-slate-600">
                  Envoyé par : {context.reporterName ? `${context.reporterName} — ` : ''}
                  {context.reporterEmail}
                  {context.organizationName ? ` · ${context.organizationName}` : ' · Équipe interne'}
                  {' · Version '}{context.appVersion}
                </p>
                <form onSubmit={submitReport} className="mt-5 space-y-4">
                  <label className="block text-sm font-medium text-slate-800">
                    Titre
                    <input
                      required
                      minLength={4}
                      maxLength={120}
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 p-3"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-800">
                    Que s’est-il passé ?
                    <textarea
                      required
                      minLength={10}
                      maxLength={3_000}
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 p-3"
                      rows={4}
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-800">
                    Étapes pour reproduire
                    <textarea
                      required
                      maxLength={3_000}
                      value={steps}
                      onChange={(event) => setSteps(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 p-3"
                      rows={3}
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-lg bg-indigo-700 px-4 py-3 font-semibold text-white disabled:opacity-50"
                  >
                    {submitting ? 'Envoi…' : 'Envoyer le signalement'}
                  </button>
                </form>
              </>
            )}
            </section>
      </BaseModal>
    </>
  )
}

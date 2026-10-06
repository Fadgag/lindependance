'use client'

import { useEffect, useState } from 'react'
import {
  IssueReportDashboardRecordSchema,
  IssueReportStatusSchema,
  type IssueReportStatus,
} from '@/schemas/issueReport'

type IssueReport = typeof IssueReportDashboardRecordSchema._output

const STATUS_LABELS: Record<IssueReportStatus, string> = {
  NEW: 'Nouveau',
  IN_PROGRESS: 'En cours',
  RESOLVED: 'Résolu',
}

function errorMessage(body: unknown, fallback: string): string {
  return body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
    ? body.error
    : fallback
}

export default function IssueReportsDashboard() {
  const [reports, setReports] = useState<IssueReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    let active = true
    async function loadReports() {
      try {
        const response = await fetch('/api/issue-reports', { cache: 'no-store' })
        const body: unknown = await response.json()
        if (!response.ok) {
          throw new Error(errorMessage(body, 'Impossible de charger les signalements.'))
        }
        const parsed = IssueReportDashboardRecordSchema.array().safeParse(body)
        if (!parsed.success) throw new Error('La liste des signalements reçue est invalide.')
        if (active) setReports(parsed.data)
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Impossible de charger les signalements.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }
    void loadReports()
    return () => { active = false }
  }, [])

  async function updateStatus(reportId: string, status: IssueReportStatus) {
    setUpdatingIds((current) => new Set(current).add(reportId))
    setError('')
    try {
      const response = await fetch(`/api/issue-reports/${encodeURIComponent(reportId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const body: unknown = await response.json()
      if (!response.ok) throw new Error(errorMessage(body, 'Impossible de mettre à jour le signalement.'))
      const parsed = IssueReportDashboardRecordSchema.safeParse(body)
      if (!parsed.success) throw new Error('La mise à jour du signalement reçue est invalide.')
      setReports((current) => current.map((report) => report.id === reportId ? parsed.data : report))
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Impossible de mettre à jour le signalement.')
    } finally {
      setUpdatingIds((current) => {
        const next = new Set(current)
        next.delete(reportId)
        return next
      })
    }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Signalements de problèmes</h1>
        <p className="mt-2 text-sm text-slate-600">
          Consultez les signalements reçus et suivez leur traitement.
        </p>
      </header>
      {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
      {loading ? <p role="status">Chargement des signalements…</p> : null}
      {!loading && !error && reports.length === 0
        ? <p className="rounded-xl bg-white p-6 text-slate-600 shadow-sm">Aucun signalement pour le moment.</p>
        : null}
      <div className="space-y-4">
        {reports.map((report) => (
          <article key={report.id} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col justify-between gap-3 sm:flex-row">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{report.title}</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {report.reporterType === 'CUSTOMER' ? 'Client du portail' : 'Personnel'}
                  {report.reporterName ? ` · ${report.reporterName}` : ''}
                  {' · '}{report.reporterEmail}
                </p>
                <p className="text-sm text-slate-600">
                  {report.organizationName || 'Équipe interne'} · {new Intl.DateTimeFormat('fr-FR', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }).format(new Date(report.createdAt))}
                </p>
              </div>
              <label className="flex shrink-0 flex-col gap-1 text-sm font-medium text-slate-700">
                État du signalement {report.title}
                <select
                  aria-label={`État du signalement ${report.title}`}
                  value={report.status}
                  disabled={updatingIds.has(report.id)}
                  onChange={(event) => {
                    const status = IssueReportStatusSchema.safeParse(event.target.value)
                    if (status.success) void updateStatus(report.id, status.data)
                  }}
                  className="rounded-lg border border-slate-300 p-2"
                >
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="space-y-2 text-sm text-slate-800">
              <p className="whitespace-pre-wrap">{report.description}</p>
              <p><strong>Étapes :</strong> <span className="whitespace-pre-wrap">{report.steps}</span></p>
              <p><strong>Page :</strong> <code>{report.pathname}</code></p>
              <p><strong>Version :</strong> {report.appVersion}</p>
            </div>
            <details className="text-sm text-slate-700">
              <summary className="cursor-pointer font-medium">Erreurs techniques ({report.errors.length})</summary>
              {report.errors.length === 0 ? <p className="mt-2">Aucune erreur récente enregistrée.</p> : (
                <ul className="mt-2 list-inside list-disc space-y-1">
                  {report.errors.map((diagnostic, index) => (
                    <li key={`${diagnostic.name}-${index}`}>
                      <strong>{diagnostic.name} :</strong> {diagnostic.message}
                    </li>
                  ))}
                </ul>
              )}
            </details>
          </article>
        ))}
      </div>
    </main>
  )
}

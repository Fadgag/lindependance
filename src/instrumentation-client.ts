import { recordClientIssueError } from '@/lib/clientIssueErrors'

function toIssueError(reason: unknown): { name: string; message: string } {
  if (reason instanceof Error) {
    return { name: reason.name, message: reason.message }
  }
  if (typeof reason === 'string') return { name: 'Error', message: reason }
  return { name: 'Error', message: 'Une erreur inattendue est survenue.' }
}

window.addEventListener('error', (event: ErrorEvent) => {
  const error = event.error instanceof Error
    ? toIssueError(event.error)
    : { name: 'Error', message: event.message || 'Une erreur inattendue est survenue.' }
  recordClientIssueError(error)
})

window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
  recordClientIssueError(toIssueError(event.reason))
})

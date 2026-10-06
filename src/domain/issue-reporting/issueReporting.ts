export type IssueClientError = {
  name: string
  message: string
}

export type IssueDiagnosticsInput = {
  pathname: string
  errors: IssueClientError[]
}

export type SanitizedIssueDiagnostics = IssueDiagnosticsInput

const MAX_RECENT_ERRORS = 5
const MAX_ERROR_TEXT_LENGTH = 500
const ISSUE_REPORT_RETENTION_MS = 90 * 24 * 60 * 60 * 1000

function redactDiagnosticText(value: string): string {
  return value
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[adresse e-mail]')
    .replace(/\bBearer\s+\S+/gi, 'Bearer [masqué]')
    .replace(/\b(?:sk|pk)_[A-Za-z0-9_-]{12,}\b/g, '[secret]')
    .replace(/\b[A-F0-9]{8}-(?:[A-F0-9]{4}-){3}[A-F0-9]{12}\b/gi, '[identifiant]')
    .replace(/\b(?:token|secret|password|api[_-]?key)\s*[:=]\s*\S+/gi, '[donnée masquée]')
    .replace(/https?:\/\/\S+/gi, '[adresse web masquée]')
    .replace(/\b\d{7,}\b/g, '[numéro masqué]')
    .slice(0, MAX_ERROR_TEXT_LENGTH)
}

export function sanitizeIssueDiagnostics(input: IssueDiagnosticsInput): SanitizedIssueDiagnostics {
  if (!input.pathname.startsWith('/') || input.pathname.startsWith('//')) {
    throw new Error('Issue report path must be an application path')
  }

  const pathname = input.pathname.split(/[?#]/, 1)[0]
  if (!pathname) throw new Error('Issue report path is required')

  return {
    pathname: pathname.slice(0, 300),
    errors: input.errors.slice(0, MAX_RECENT_ERRORS).map(({ name, message }) => ({
      name: redactDiagnosticText(name),
      message: redactDiagnosticText(message),
    })),
  }
}

export function isIssueReportExpired(resolvedAt: Date | null, now: Date): boolean {
  return resolvedAt !== null
    && resolvedAt.getTime() <= now.getTime() - ISSUE_REPORT_RETENTION_MS
}

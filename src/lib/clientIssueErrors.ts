export type ClientIssueError = {
  name: string
  message: string
}

export function createClientIssueErrorBuffer(maxErrors = 5) {
  const errors: ClientIssueError[] = []

  return {
    record(error: ClientIssueError) {
      const name = error.name.trim().slice(0, 100)
      const message = error.message.trim().slice(0, 2_000)
      if (!message) return
      errors.push({ name: name || 'Error', message })
      if (errors.length > maxErrors) errors.splice(0, errors.length - maxErrors)
    },
    read(): ClientIssueError[] {
      return errors.map((error) => ({ ...error }))
    },
  }
}

const clientIssueErrorBuffer = createClientIssueErrorBuffer()

export function recordClientIssueError(error: ClientIssueError): void {
  clientIssueErrorBuffer.record(error)
}

export function getRecentClientIssueErrors(): ClientIssueError[] {
  return clientIssueErrorBuffer.read()
}

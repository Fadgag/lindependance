import { NextResponse } from 'next/server'
import { logger } from './logger'

// Central API error response helper
export function apiErrorResponse(err: unknown) {
  // Log full error server-side for debugging
  logger.error('API error:', err)

  const message = err instanceof Error ? err.message : String(err)

  // Preserve specific business errors when helpful
  if (message === 'No sessions remaining') {
    return NextResponse.json({ error: message }, { status: 409 })
  }

  // Default: do not leak internal error details to client
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}

export default apiErrorResponse


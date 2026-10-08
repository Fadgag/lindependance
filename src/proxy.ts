// Middleware Next.js — seul point d'entrée pour l'auth.
// Utilise auth() de next-auth v5 pour valider la session et rediriger si nécessaire.
import { auth } from "./auth"
import { NextResponse } from 'next/server'
import type { NextAuthRequest } from 'next-auth'

function isBetaCampaignPath(pathname: string): boolean {
  return pathname === '/test-campaigns'
    || pathname.startsWith('/test-campaigns/')
    || pathname === '/retour-test'
    || pathname.startsWith('/retour-test/')
}

function isBetaCampaignApiPath(pathname: string): boolean {
  return pathname === '/api/test-campaigns'
    || pathname.startsWith('/api/test-campaigns/')
    || pathname === '/api/test-feedback'
    || pathname.startsWith('/api/test-feedback/')
}

function isPreprodDeployment(): boolean {
  return process.env.VERCEL_ENV === 'preview'
    && process.env.VERCEL_GIT_COMMIT_REF === 'preprod'
}

// RAISON: NextAuthRequest étend NextRequest avec `auth: Session | null` (next-auth v5).
// On utilise NextAuthRequest plutôt qu'un cast ou une augmentation de module pour avoir
// un typage correct sans double cast unsafe.
async function middlewareFn(req: NextAuthRequest) {
  const pathname = String(req.nextUrl?.pathname ?? '')
  const isBetaApi = isBetaCampaignApiPath(pathname)
  if (isBetaCampaignPath(pathname) || isBetaApi) {
    if (!isPreprodDeployment()) {
      return isBetaApi
        ? NextResponse.json({ error: 'Not found' }, { status: 404 })
        : new Response(null, { status: 404 })
    }
    if (isBetaApi) return
  }

  if (pathname === '/portail' || pathname.startsWith('/portail/')) return
  if (pathname === '/retour-test' || pathname.startsWith('/retour-test/')) return

  const authClaim = req.auth ?? null
  const isLoggedIn = !!authClaim
  const isAuthPage = pathname.startsWith("/auth")

  if (pathname === '/') {
    if (authClaim?.user?.accountType === 'STAFF') {
      const destination = authClaim.user.role === 'TECH_ADMIN' && isPreprodDeployment()
        ? '/test-campaigns'
        : '/dashboard'
      return Response.redirect(new URL(destination, req.nextUrl))
    }
    return
  }

  if (!isLoggedIn && !isAuthPage) {
    return Response.redirect(new URL("/auth/signin", req.nextUrl))
  }
  // Authentifié ou page publique → Next.js continue
}

// RAISON: next-auth v5 beta types auth() return as AppRouteHandlerFn(req, ctx) — ctx required by type
// but our middleware never reads ctx, and unit tests call middleware(req) without ctx.
// Cast to optional-ctx signature to satisfy both runtime and test calls.
// NextAuthRequest étend NextRequest, donc ce type couvre les deux cas (runtime + tests).
type MiddlewareHandler = (req: NextAuthRequest, ctx?: Record<string, unknown>) => Response | void | Promise<Response | void>
export const middleware: MiddlewareHandler = auth(middlewareFn) as unknown as MiddlewareHandler
export default middleware

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest\\.json|manifest\\.webmanifest|sw\\.js).*)",
    '/api/test-campaigns/:path*',
    '/api/test-feedback/:path*',
  ],
}

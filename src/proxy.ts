// Middleware Next.js — seul point d'entrée pour l'auth.
// Utilise auth() de next-auth v5 pour valider la session et rediriger si nécessaire.
import { auth } from "./auth"
import type { NextRequest } from 'next/server'

async function middlewareFn(req: NextRequest) {
  // RAISON: next-auth v5 injecte req.auth dynamiquement sur NextRequest — non typé nativement
  const maybeReq = req as unknown as Record<string, unknown>
  const authClaim = maybeReq['auth'] ?? null
  const isLoggedIn = !!authClaim
  const isAuthPage = String(req.nextUrl?.pathname ?? '').startsWith("/auth")

  if (!isLoggedIn && !isAuthPage) {
    return Response.redirect(new URL("/auth/signin", req.nextUrl))
  }
  // Authentifié ou page publique → Next.js continue
}

export const middleware = auth(middlewareFn)
export default middleware

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}

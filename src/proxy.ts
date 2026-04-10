// Middleware Next.js — seul point d'entrée pour l'auth.
// Utilise auth() de next-auth v5 pour valider la session et rediriger si nécessaire.
import { auth } from "./auth"
import type { NextAuthRequest } from 'next-auth'

// RAISON: NextAuthRequest étend NextRequest avec `auth: Session | null` (next-auth v5).
// On utilise NextAuthRequest plutôt qu'un cast ou une augmentation de module pour avoir
// un typage correct sans double cast unsafe.
async function middlewareFn(req: NextAuthRequest) {
  const authClaim = req.auth ?? null
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

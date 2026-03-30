import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Middleware explicit: redirect to /auth/signin when no NextAuth token found
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow Next.js internals, auth endpoints and static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/auth') ||
    pathname === '/favicon.ico' ||
    pathname === '/sw.js'
  ) {
    return NextResponse.next()
  }

  try {
    const token = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET })
    // DEBUG: log token presence for troubleshooting
    try { console.log('[middleware] pathname=', pathname, ' token=', !!token) } catch (e) { /* ignore */ }
    if (!token) {
      // Not authenticated -> redirect to signin
      const url = req.nextUrl.clone()
      url.pathname = '/auth/signin'
      // optional: store the return URL
      url.searchParams.set('callbackUrl', req.nextUrl.href)
      return NextResponse.redirect(url)
    }
    // authenticated -> continue
    return NextResponse.next()
  } catch (e) {
    // On error, be conservative and redirect to signin
    const url = req.nextUrl.clone()
    url.pathname = '/auth/signin'
    url.searchParams.set('callbackUrl', req.nextUrl.href)
    return NextResponse.redirect(url)
  }
}

export const config = {
  // Apply to all paths — internal checks above will skip static/api/auth routes
  matcher: ['/:path*'],
}

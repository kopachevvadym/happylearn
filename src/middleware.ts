import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

const intlMiddleware = createMiddleware(routing)

const protectedRoutes = ['/dashboard', '/words', '/collections', '/study', '/progress', '/settings']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Strip locale prefix to check against protected routes
  const pathnameWithoutLocale = pathname.replace(/^\/(uk|en)/, '') || '/'
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathnameWithoutLocale.startsWith(route)
  )

  // Run intl middleware first to get the response with locale headers
  const response = intlMiddleware(request)

  // Create Supabase client using the request/response
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Refresh session if expired
  const { data: { user } } = await supabase.auth.getUser()

  // Redirect to auth if accessing protected route without session
  if (isProtectedRoute && !user) {
    const locale = pathname.split('/')[1] ?? 'uk'
    const redirectUrl = new URL(`/${locale}/auth`, request.url)
    redirectUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect to dashboard if already authenticated and accessing auth page
  if (pathnameWithoutLocale === '/auth' && user) {
    const locale = pathname.split('/')[1] ?? 'uk'
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
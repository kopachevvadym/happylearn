import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

const intlMiddleware = createMiddleware(routing)

const protectedRoutes = [
  '/dashboard',
  '/words',
  '/collections',
  '/study',
  '/progress',
  '/settings',
  '/onboarding',
]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Strip locale prefix to check against protected routes
  const pathnameWithoutLocale = pathname.replace(/^\/(uk|en)/, '') || '/'
  const hasLocalePrefix = pathnameWithoutLocale !== pathname

  // Run intl middleware first to get the response with locale headers
  const response = intlMiddleware(request)

  // If there's no locale prefix, let intlMiddleware redirect to add it.
  // Auth checks run on the next (locale-prefixed) request to avoid wrong locale extraction.
  if (!hasLocalePrefix) {
    return response
  }

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathnameWithoutLocale.startsWith(route)
  )

  // No Supabase auth cookies → nothing to refresh. Skip the auth round-trip
  // entirely for anonymous traffic (public catalog, landing) instead of
  // paying a network call to the Supabase Auth server on every request.
  const hasAuthCookies = request.cookies
    .getAll()
    .some((c) => c.name.startsWith('sb-') && c.name.includes('-auth-token'))

  if (!hasAuthCookies) {
    if (isProtectedRoute) {
      const locale = pathname.split('/')[1] ?? 'uk'
      const redirectUrl = new URL(`/${locale}/auth`, request.url)
      redirectUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(redirectUrl)
    }
    return response
  }

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
  const {
    data: { user },
  } = await supabase.auth.getUser()

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
  matcher: ['/((?!api|auth/callback|auth/confirm|_next|_vercel|.*\\..*).*)'],
}

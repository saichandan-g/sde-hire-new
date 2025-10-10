import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Skip middleware for DSA tutor routes to prevent auth token conflicts
  // This allows client-side Supabase operations to work without interference
  if (pathname.startsWith('/dsa-tutor')) {
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          req.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          req.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Refresh session if expired - required for Server Components
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/login', '/signup']
  const isPublicRoute = publicRoutes.includes(pathname)

  // If user is not authenticated and trying to access protected route
  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // If user is authenticated
  if (user) {
    // If trying to access login/signup pages, redirect to dashboard
    if (pathname === '/login' || pathname === '/signup') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    // Check if user is registered (only for protected routes)
    if (!isPublicRoute && pathname !== '/register') {
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('is_registered')
          .eq('id', user.id)
          .single()

        // If user is not registered and not on register page, redirect to register
        if (userData && !userData.is_registered && pathname !== '/register') {
          return NextResponse.redirect(new URL('/register', req.url))
        }

        // If user is registered and on register page, redirect to dashboard
        if (userData && userData.is_registered && pathname === '/register') {
          return NextResponse.redirect(new URL('/dashboard', req.url))
        }
      } catch (error) {
        console.error('Error checking user registration status:', error)
        // On error, allow the request to continue
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
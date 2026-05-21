import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // ── 1. Public paths ──────────────────────────────────────────────
  if (isPublicPath(pathname)) {
    // Bounce authenticated users off login/register to dashboard
    // (dashboard proxy will redirect to onboarding if needed)
    if (user && (pathname === '/auth/login' || pathname === '/auth/register')) {
      // Fetch role to redirect admin correctly
      const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
      const dest = (p?.role as string | undefined) === 'admin' ? '/admin' : '/dashboard'
      return NextResponse.redirect(new URL(dest, request.url))
    }
    return response
  }

  // ── 2. Auth wall — everything below requires login ────────────────
  if (!user) {
    const dest = request.nextUrl.clone()
    dest.pathname = '/auth/login'
    dest.searchParams.set('next', pathname)
    return NextResponse.redirect(dest)
  }

  // ── 3. Profile fetch for ALL authenticated requests ───────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, onboarding_complete')
    .eq('id', user.id)
    .maybeSingle()

  const metaRole = user.user_metadata?.role === 'client' ? 'client' : 'freelancer'
  const role = (profile?.role as string | undefined) ?? metaRole
  const onboardingOk = profile?.onboarding_complete ?? false

  // ── 4. Onboarding gate — block ALL non-onboarding pages ──────────
  if (!onboardingOk && role !== 'admin' && !pathname.startsWith('/onboarding/')) {
    const dest = role === 'client' ? '/onboarding/client' : '/onboarding/freelancer'
    return NextResponse.redirect(new URL(dest, request.url))
  }

  // ── 5. Role-lock onboarding pages ────────────────────────────────
  if (pathname.startsWith('/onboarding/freelancer') && role !== 'freelancer') {
    return NextResponse.redirect(new URL('/onboarding/client', request.url))
  }
  if (pathname.startsWith('/onboarding/client') && role !== 'client') {
    return NextResponse.redirect(new URL('/onboarding/freelancer', request.url))
  }

  // ── 6. Admin only ─────────────────────────────────────────────────
  if (pathname.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  // Redirect admin away from regular dashboard
  if (role === 'admin' && pathname === '/dashboard') {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  // ── 7. Role-specific page guards ──────────────────────────────────
  const segments = pathname.split('/').filter(Boolean)
  const isJobApplyPath     = segments[0] === 'jobs' && segments.length === 3 && segments[2] === 'apply'
  const isJobProposalsPath = segments[0] === 'jobs' && segments.length === 3 && segments[2] === 'proposals'

  if (role === 'freelancer') {
    if (pathname === '/jobs/post') return NextResponse.redirect(new URL('/dashboard', request.url))
    if (isJobProposalsPath) return NextResponse.redirect(new URL('/dashboard', request.url))
    if (pathname === '/my-jobs' || pathname.startsWith('/my-jobs/')) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  if (role === 'client') {
    if (pathname === '/jobs') return NextResponse.redirect(new URL('/my-jobs', request.url))
    if (isJobApplyPath) return NextResponse.redirect(new URL('/dashboard', request.url))
    if (pathname === '/profile/edit') return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}

function isPublicPath(pathname: string): boolean {
  if (pathname.startsWith('/api/')) return true
  if (pathname === '/') return true
  // All auth flow pages (login, register, callback, verify-email, select-role, reset-password)
  if (pathname.startsWith('/auth/')) return true
  // /jobs feed is protected (client vs freelancer gate), not public
  if (pathname === '/jobs') return false
  // Individual job detail pages are public (read-only / SEO)
  if (
    pathname.startsWith('/jobs/') &&
    pathname !== '/jobs/post' &&
    !pathname.endsWith('/apply') &&
    !pathname.endsWith('/proposals')
  ) return true
  // Public freelancer profile pages
  if (pathname.startsWith('/profile/') && pathname !== '/profile/edit') return true
  // Public freelancers directory
  if (pathname.startsWith('/freelancers')) return true
  return false
}


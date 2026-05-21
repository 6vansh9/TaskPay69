import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code      = searchParams.get('code')
  const next      = searchParams.get('next') ?? '/dashboard'
  // role is passed by the register form for both email and Google OAuth paths
  const roleParam = searchParams.get('role')

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`)
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, onboarding_complete')
    .eq('id', user.id)
    .maybeSingle()

  // Profile not yet created (trigger lag or Google OAuth first-time via login page)
  if (!profile) {
    const fallbackRole = roleParam === 'client' ? 'client' : 'freelancer'
    await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email ?? '',
      full_name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? '',
      avatar_url: user.user_metadata?.avatar_url ?? null,
      role: fallbackRole,
      onboarding_complete: false,
    })
    const dest = fallbackRole === 'client' ? 'client' : 'freelancer'
    return NextResponse.redirect(`${origin}/onboarding/${dest}`)
  }

  // Onboarding not complete — determine correct role and redirect
  if (!profile.onboarding_complete) {
    let role = profile.role as string

    if (roleParam === 'client' || roleParam === 'freelancer') {
      // Role explicitly passed (register page flow) — trust it
      if (roleParam !== role) {
        await supabase.from('profiles').update({ role: roleParam }).eq('id', user.id)
        role = roleParam
      }
    } else {
      // No roleParam — Google OAuth via login page with incomplete onboarding
      // Send to role selection so they can confirm their role
      return NextResponse.redirect(`${origin}/auth/select-role`)
    }

    const dest = role === 'client' ? 'client' : 'freelancer'
    return NextResponse.redirect(`${origin}/onboarding/${dest}`)
  }

  // Onboarding complete — go to intended destination (admin always goes to /admin)
  const dest = (profile.role as string) === 'admin' ? '/admin' : next
  return NextResponse.redirect(`${origin}${dest}`)
}

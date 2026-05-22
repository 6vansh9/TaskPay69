import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendWelcomeEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: existing } = await supabase
    .from('profiles')
    .select('role, onboarding_complete')
    .eq('id', user.id)
    .single()

  if (existing?.onboarding_complete) {
    return NextResponse.json({ error: 'Onboarding already completed.' }, { status: 409 })
  }

  const body = await request.json().catch(() => ({}))
  const role = existing?.role ?? 'freelancer'
  const updates: Record<string, unknown> = { onboarding_complete: true }

  if (role === 'freelancer') {
    const name = typeof body.full_name === 'string' ? body.full_name.trim() : ''
    const bio = typeof body.bio === 'string' ? body.bio.trim() : ''
    if (!name) return NextResponse.json({ error: 'full_name is required.' }, { status: 400 })
    if (bio.length < 100) return NextResponse.json({ error: 'Bio must be at least 100 characters.' }, { status: 400 })

    updates.full_name = name
    updates.title = typeof body.title === 'string' ? body.title.trim() : ''
    updates.bio = bio
    updates.location = typeof body.location === 'string' ? body.location.trim() : ''

    const rate = Number(body.hourly_rate)
    if (!isNaN(rate) && rate >= 0) updates.hourly_rate = rate

    const years = Number(body.experience_years)
    if (!isNaN(years) && years >= 0) updates.experience_years = years

    if (Array.isArray(body.skills)) {
      updates.skills = (body.skills as string[]).slice(0, 10).map((s: string) => s.trim()).filter(Boolean)
    }
    if (Array.isArray(body.skills_with_level)) {
      updates.skills_with_level = (body.skills_with_level as unknown[]).slice(0, 10)
    }
    if (Array.isArray(body.portfolio)) {
      updates.portfolio = (body.portfolio as unknown[]).slice(0, 3)
    }
    if (body.education && typeof body.education === 'object') {
      updates.education = body.education
    }
    if (typeof body.linkedin_url === 'string') updates.linkedin_url = body.linkedin_url.trim()
    if (typeof body.github_url === 'string') updates.github_url = body.github_url.trim()

  } else {
    const name = typeof body.full_name === 'string' ? body.full_name.trim() : ''
    if (!name) return NextResponse.json({ error: 'full_name is required.' }, { status: 400 })

    updates.full_name = name
    updates.company_name = typeof body.company_name === 'string' ? body.company_name.trim() : ''
    updates.industry = typeof body.industry === 'string' ? body.industry.trim() : ''
    updates.company_size = typeof body.company_size === 'string' ? body.company_size.trim() : ''
    updates.location = typeof body.location === 'string' ? body.location.trim() : ''
    updates.website = typeof body.website === 'string' ? body.website.trim() : ''

    if (Array.isArray(body.hire_categories)) {
      updates.hire_categories = (body.hire_categories as string[]).slice(0, 3)
    }
    if (typeof body.hire_frequency === 'string') updates.hire_frequency = body.hire_frequency.trim()
    if (typeof body.budget_range === 'string') updates.budget_range = body.budget_range.trim()
  }

  updates.updated_at = new Date().toISOString()

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)

  if (error) {
    console.error('[onboarding/complete] update error:', error.message)
    return NextResponse.json({ error: 'Failed to save profile.' }, { status: 500 })
  }

  const recipientName = typeof updates.full_name === 'string'
    ? updates.full_name
    : user.email?.split('@')[0] ?? 'there'

  sendWelcomeEmail({
    recipientEmail: user.email ?? '',
    recipientName,
    role: role as 'freelancer' | 'client',
  }).catch(() => {})

  return NextResponse.json({ success: true })
}

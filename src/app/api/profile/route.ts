import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_FREELANCER = [
  'full_name','title','bio','location','hourly_rate','skills',
  'is_available','portfolio','languages','work_experience','education',
  'experience_years','linkedin_url','github_url','skills_with_level',
  'notification_prefs','work_history','avatar_url',
] as const

const ALLOWED_CLIENT = [
  'full_name','bio','location','company_name','industry','website',
  'company_size','hire_categories','hire_frequency','budget_range',
  'notification_prefs','avatar_url',
] as const

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: existing } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const role = (existing as { role: string } | null)?.role ?? 'freelancer'

  const body = await request.json().catch(() => ({}))
  const allowed = role === 'freelancer' ? ALLOWED_FREELANCER : ALLOWED_CLIENT

  // Pick only allowed fields from body
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  // Validate hourly_rate
  if ('hourly_rate' in updates) {
    const rate = Number(updates.hourly_rate)
    if (isNaN(rate) || rate < 0 || rate > 100000) {
      return NextResponse.json({ error: 'hourly_rate must be between 0 and 100,000' }, { status: 400 })
    }
    updates.hourly_rate = rate
  }

  // Validate skills array
  if ('skills' in updates) {
    const skills = updates.skills
    if (!Array.isArray(skills) || skills.some(s => typeof s !== 'string')) {
      return NextResponse.json({ error: 'skills must be an array of strings' }, { status: 400 })
    }
    updates.skills = (skills as string[]).slice(0, 15).map(s => s.trim()).filter(Boolean)
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 })
  }

  updates.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

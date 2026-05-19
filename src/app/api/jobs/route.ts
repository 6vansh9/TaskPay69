import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const CATEGORIES = ['Web Development','Mobile Apps','UI/UX Design','Data Science','Content Writing','Digital Marketing','Video Editing','Graphic Design']

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const q         = searchParams.get('q') || ''
  const category  = searchParams.get('category') || ''
  const budgetType= searchParams.get('budget_type') || ''
  const level     = searchParams.get('experience_level') || ''
  const duration  = searchParams.get('duration') || ''
  const page      = parseInt(searchParams.get('page') || '1')
  const limit     = 20
  const offset    = (page - 1) * limit

  const supabase = await createClient()

  let query = supabase
    .from('jobs')
    .select(`*, profiles:client_id(full_name, avatar_url, company_name, rating, review_count)`, { count: 'exact' })
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (q) query = query.textSearch('fts', q, { type: 'websearch' })
  if (category) query = query.eq('category', category)
  if (budgetType) query = query.eq('budget_type', budgetType)
  if (level) query = query.eq('level', level)
  if (duration) query = query.eq('duration', duration)

  const { data: jobs, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ jobs: jobs ?? [], total: count ?? 0, categories: CATEGORIES })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'client') return NextResponse.json({ error: 'Only clients can post jobs' }, { status: 403 })

  const body = await request.json()
  const { title, category, description, budget_type, budget_min, budget_max, skills, experience_level, duration, job_type } = body

  if (!title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  if (!description?.trim() || description.length < 50) return NextResponse.json({ error: 'Description must be at least 50 characters' }, { status: 400 })
  if (!skills?.length) return NextResponse.json({ error: 'At least one skill is required' }, { status: 400 })

  const { data: job, error } = await supabase.from('jobs').insert({
    client_id: user.id,
    title: title.trim(),
    category,
    description: description.trim(),
    budget_type,
    budget_min: parseFloat(budget_min) || 0,
    budget_max: parseFloat(budget_max) || 0,
    skills,
    skills_required: skills,
    experience_level,
    level: experience_level,
    duration,
    job_type: job_type || budget_type,
    status: 'open',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // increment jobs_posted counter (best-effort)
  supabase.rpc('increment_jobs_posted' as never, { uid: user.id } as never)

  return NextResponse.json(job, { status: 201 })
}

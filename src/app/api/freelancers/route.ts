import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const q        = searchParams.get('q')?.trim() ?? ''
  const skill    = searchParams.get('skill')?.trim() ?? ''
  const minRate  = parseFloat(searchParams.get('min_rate') ?? '0') || 0
  const maxRate  = parseFloat(searchParams.get('max_rate') ?? '0') || 0
  const minRating = parseFloat(searchParams.get('min_rating') ?? '0') || 0
  const verified  = searchParams.get('verified') === 'true'
  const page     = parseInt(searchParams.get('page') ?? '1')
  const limit    = 20
  const offset   = (page - 1) * limit

  const supabase = await createClient()

  let query = supabase
    .from('profiles')
    .select(
      'id, full_name, avatar_url, title, bio, hourly_rate, skills, skills_with_level, location, rating, review_count, jobs_completed, phone_verified, edu_verified, is_available',
      { count: 'exact' }
    )
    .eq('role', 'freelancer')
    .eq('onboarding_complete', true)
    .order('rating', { ascending: false })
    .order('jobs_completed', { ascending: false })
    .range(offset, offset + limit - 1)

  if (q) {
    query = query.or(`full_name.ilike.%${q}%,title.ilike.%${q}%,bio.ilike.%${q}%`)
  }
  if (skill) {
    query = query.contains('skills', [skill])
  }
  if (minRate > 0) {
    query = query.gte('hourly_rate', minRate)
  }
  if (maxRate > 0) {
    query = query.lte('hourly_rate', maxRate)
  }
  if (minRating > 0) {
    query = query.gte('rating', minRating)
  }
  if (verified) {
    query = query.or('phone_verified.eq.true,edu_verified.eq.true')
  }

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ freelancers: data ?? [], total: count ?? 0 })
}

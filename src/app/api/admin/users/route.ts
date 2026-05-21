import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single()
  if ((profile as { role: string } | null)?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const search     = request.nextUrl.searchParams.get('search') ?? ''
  const roleFilter = request.nextUrl.searchParams.get('role')   ?? ''
  const page  = parseInt(request.nextUrl.searchParams.get('page') ?? '1')
  const limit = 50
  const from  = (page - 1) * limit

  let query = supabaseAdmin
    .from('profiles')
    .select('id, full_name, email, role, is_banned, ban_reason, phone_verified, edu_verified, created_at, jobs_completed, total_earnings, warned_at, admin_notes, avatar_url', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1)

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
  }

  if (roleFilter === 'banned') {
    query = query.eq('is_banned', true)
  } else if (roleFilter && roleFilter !== 'all') {
    query = query.eq('role', roleFilter)
  }

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ users: data ?? [], total: count ?? 0, page, limit })
}

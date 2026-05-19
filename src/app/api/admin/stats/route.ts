import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if ((profile as { role: string } | null)?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const [
    { count: totalUsers },
    { count: totalJobs },
    { count: activeContracts },
    { count: openDisputes },
    { count: pendingPayouts },
    { data: revenue },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('jobs').select('*', { count: 'exact', head: true }),
    supabase.from('contracts').select('*', { count: 'exact', head: true }).in('status', ['active','delivered']),
    supabase.from('disputes').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('type', 'payout').eq('status', 'pending'),
    supabase.from('transactions').select('platform_fee').eq('type', 'escrow_release').eq('status', 'pending_transfer'),
  ])

  const totalRevenue = (revenue ?? []).reduce((s, t) => s + ((t as { platform_fee: number }).platform_fee ?? 0), 0)

  return NextResponse.json({
    totalUsers: totalUsers ?? 0,
    totalJobs: totalJobs ?? 0,
    activeContracts: activeContracts ?? 0,
    openDisputes: openDisputes ?? 0,
    pendingPayouts: pendingPayouts ?? 0,
    totalRevenue,
  })
}

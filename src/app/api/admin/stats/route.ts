import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single()
  if ((profile as { role: string } | null)?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: totalUsers },
    { count: totalJobs },
    { count: activeContracts },
    { count: openDisputes },
    { count: totalDisputes },
    { count: pendingPayouts },
    { count: totalTransactions },
    { data: revTxs },
    { data: paidOutTxs },
    { data: chartTxs },
  ] = await Promise.all([
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('jobs').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('contracts').select('*', { count: 'exact', head: true }).in('status', ['active', 'delivered']),
    supabaseAdmin.from('disputes').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    supabaseAdmin.from('disputes').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('transactions').select('*', { count: 'exact', head: true }).eq('type', 'payout').eq('status', 'pending'),
    supabaseAdmin.from('transactions').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('transactions').select('platform_fee').eq('type', 'escrow_release'),
    supabaseAdmin.from('transactions').select('amount').eq('type', 'payout').eq('status', 'completed'),
    supabaseAdmin.from('transactions').select('created_at, platform_fee').eq('type', 'escrow_release').gte('created_at', thirtyDaysAgo),
  ])

  const totalRevenue = (revTxs ?? []).reduce((s, t) => s + (Number((t as { platform_fee: number }).platform_fee) || 0), 0)
  const totalPaidOut = (paidOutTxs ?? []).reduce((s, t) => s + (Number((t as { amount: number }).amount) || 0), 0)

  // Daily revenue for last 30 days
  const dailyMap: Record<string, number> = {}
  for (const tx of chartTxs ?? []) {
    const row = tx as { created_at: string; platform_fee: number }
    const day = row.created_at.split('T')[0]
    dailyMap[day] = (dailyMap[day] ?? 0) + (Number(row.platform_fee) || 0)
  }
  const chartData: { date: string; revenue: number }[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    const key = d.toISOString().split('T')[0]
    chartData.push({ date: key.slice(5), revenue: dailyMap[key] ?? 0 })
  }

  return NextResponse.json({
    totalUsers:        totalUsers        ?? 0,
    totalJobs:         totalJobs         ?? 0,
    activeContracts:   activeContracts   ?? 0,
    openDisputes:      openDisputes      ?? 0,
    totalDisputes:     totalDisputes     ?? 0,
    pendingPayouts:    pendingPayouts    ?? 0,
    totalTransactions: totalTransactions ?? 0,
    totalRevenue,
    totalPaidOut,
    chartData,
  })
}

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

  const [
    { data: revData },
    { data: transactions, error: txError },
    { data: adminWithdrawals },
  ] = await Promise.all([
    // Dedicated revenue query — simple, no joins, bulletproof
    supabaseAdmin
      .from('transactions')
      .select('platform_fee, amount')
      .eq('type', 'escrow_release'),

    // Full transaction list for the table
    supabaseAdmin
      .from('transactions')
      .select(`
        id, type, amount, platform_fee, net_amount, status, created_at, payment_ref,
        payer:profiles!payer_id(full_name),
        payee:profiles!payee_id(full_name),
        contract:contract_id(id, job:job_id(title))
      `)
      .order('created_at', { ascending: false })
      .limit(500),

    // Admin withdrawn amount
    supabaseAdmin
      .from('admin_withdrawals')
      .select('amount')
      .eq('status', 'completed'),
  ])

  if (txError) {
    console.error('[admin/financials] tx query error:', txError.message)
    // Fall back to simple query on join error
    const { data: simpleTxs } = await supabaseAdmin
      .from('transactions')
      .select(`id, type, amount, platform_fee, net_amount, status, created_at, payment_ref,
        payer:profiles!payer_id(full_name),
        payee:profiles!payee_id(full_name),
        contract:contract_id(id, job:job_id(title))`)
      .order('created_at', { ascending: false })
      .limit(500)

    const totalRevenue = (revData ?? []).reduce((s, t) => {
      const fee = Number(t.platform_fee) || 0
      return s + (fee > 0 ? fee : Number(t.amount) * 0.10)
    }, 0)

    const adminWithdrawn = (adminWithdrawals ?? [])
      .reduce((s, w) => s + (Number((w as { amount: number }).amount) || 0), 0)

    return NextResponse.json({
      transactions: simpleTxs ?? [],
      totalRevenue,
      adminWithdrawn,
      availableBalance: Math.max(0, totalRevenue - adminWithdrawn),
    })
  }

  // Use platform_fee if set, else calculate as amount * 10%
  const totalRevenue = (revData ?? []).reduce((s, t) => {
    const fee = Number(t.platform_fee) || 0
    return s + (fee > 0 ? fee : Number(t.amount) * 0.10)
  }, 0)

  const adminWithdrawn = (adminWithdrawals ?? [])
    .reduce((s, w) => s + (Number((w as { amount: number }).amount) || 0), 0)

  return NextResponse.json({
    transactions: transactions ?? [],
    totalRevenue,
    adminWithdrawn,
    availableBalance: Math.max(0, totalRevenue - adminWithdrawn),
  })
}

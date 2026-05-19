import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('transactions')
    .select(`*, contract:contract_id(id, job:job_id(title))`)
    .eq('payee_id', user.id)
    .eq('type', 'payout')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, total_earnings, bank_account')
    .eq('id', user.id).single()
  const p = profile as { role: string; total_earnings: number; bank_account: Record<string, unknown> | null } | null

  if (p?.role !== 'freelancer') return NextResponse.json({ error: 'Only freelancers can request payouts' }, { status: 403 })

  const { amount, bank_account } = await request.json()
  if (!amount || amount <= 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
  if (!bank_account?.account_number || !bank_account?.ifsc || !bank_account?.account_name) {
    return NextResponse.json({ error: 'Bank account details required (account_number, ifsc, account_name)' }, { status: 400 })
  }

  // Save bank account to profile
  await supabase.from('profiles').update({ bank_account }).eq('id', user.id)

  // Check total released but not yet paid out
  const { data: released } = await supabase
    .from('transactions')
    .select('net_amount')
    .eq('payee_id', user.id)
    .eq('type', 'escrow_release')
    .eq('status', 'pending_transfer')

  const availableBalance = (released ?? []).reduce((s, t) => s + ((t as { net_amount: number }).net_amount), 0)
  if (amount > availableBalance) {
    return NextResponse.json({
      error: `Requested ₹${amount} exceeds available balance of ₹${availableBalance.toFixed(2)}`,
    }, { status: 400 })
  }

  const { data: tx, error } = await supabase.from('transactions').insert({
    payee_id: user.id,
    amount,
    platform_fee: 0,
    net_amount: amount,
    type: 'payout',
    status: 'pending',
    payment_ref: `payout_req_${Date.now()}`,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('notifications').insert({
    user_id: user.id,
    title: 'Payout requested',
    message: `₹${amount.toLocaleString()} payout to ${bank_account.account_name} is being processed.`,
    type: 'payment',
    link: `/payouts`,
  })

  return NextResponse.json(tx, { status: 201 })
}

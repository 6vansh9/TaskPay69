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
    .select('role')
    .eq('id', user.id)
    .single()

  if ((profile as { role: string } | null)?.role !== 'freelancer') {
    return NextResponse.json({ error: 'Only freelancers can request payouts' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const { amount, payment_method, upi_id, account_number, ifsc, account_name, bank_name } = body

  if (!amount || Number(amount) < 500) {
    return NextResponse.json({ error: 'Minimum withdrawal amount is ₹500' }, { status: 400 })
  }

  if (!payment_method || !['upi', 'bank'].includes(payment_method)) {
    return NextResponse.json({ error: 'payment_method must be "upi" or "bank"' }, { status: 400 })
  }

  if (payment_method === 'upi') {
    if (!upi_id || typeof upi_id !== 'string' || !upi_id.trim()) {
      return NextResponse.json({ error: 'UPI ID is required' }, { status: 400 })
    }
  } else {
    if (!account_number || !ifsc || !account_name) {
      return NextResponse.json({ error: 'account_number, ifsc, and account_name are required' }, { status: 400 })
    }
  }

  const payoutDetails =
    payment_method === 'upi'
      ? { payment_method: 'upi', upi_id: upi_id.trim() }
      : { payment_method: 'bank', account_number, ifsc, account_name, bank_name: bank_name ?? '' }

  // Persist latest payment details to profile for admin view
  await supabase.from('profiles').update({ bank_account: payoutDetails }).eq('id', user.id)

  const { error: txError } = await supabase.from('transactions').insert({
    payee_id: user.id,
    amount: Number(amount),
    platform_fee: 0,
    net_amount: Number(amount),
    type: 'payout',
    status: 'pending',
    payment_ref: `payout_${payment_method}_${Date.now()}`,
    payout_details: payoutDetails,
  })

  if (txError) return NextResponse.json({ error: txError.message }, { status: 500 })

  await supabase.from('notifications').insert({
    user_id: user.id,
    title: 'Payout requested',
    message:
      payment_method === 'upi'
        ? `₹${Number(amount).toLocaleString()} payout to UPI ${upi_id} is being processed.`
        : `₹${Number(amount).toLocaleString()} payout to ${account_name} is being processed.`,
    type: 'payment',
    link: '/payouts',
  })

  return NextResponse.json({ success: true, message: 'Payout request submitted. Payment within 2-3 business days.' })
}

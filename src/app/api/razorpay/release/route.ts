import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PLATFORM_FEE_PCT } from '@/lib/razorpay'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { contract_id } = await request.json()

  const { data: raw } = await supabase
    .from('contracts')
    .select('id, client_id, freelancer_id, amount, razorpay_payment_id, status')
    .eq('id', contract_id)
    .single()

  const contract = raw as {
    id: string; client_id: string; freelancer_id: string
    amount: number | null; razorpay_payment_id: string | null; status: string
  } | null

  if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
  if (contract.client_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!contract.razorpay_payment_id) {
    return NextResponse.json({ error: 'Escrow not funded yet' }, { status: 400 })
  }

  // Check no duplicate release
  const { data: existing } = await supabase
    .from('transactions')
    .select('id')
    .eq('contract_id', contract_id)
    .eq('type', 'escrow_release')
    .maybeSingle()
  if (existing) return NextResponse.json({ error: 'Payment already released' }, { status: 409 })

  const amount = contract.amount ?? 0
  const platformFee = Math.round(amount * PLATFORM_FEE_PCT * 100) / 100
  const freelancerPayout = amount - platformFee

  await Promise.all([
    supabase.from('transactions').insert({
      contract_id,
      payer_id: user.id,
      payee_id: contract.freelancer_id,
      amount,
      platform_fee: platformFee,
      net_amount: freelancerPayout,
      type: 'escrow_release',
      // pending_transfer = funds approved in DB, manual bank transfer still needed
      status: 'pending_transfer',
      payment_ref: contract.razorpay_payment_id,
    }),
    supabase.from('contracts').update({
      status: 'complete',
      completed_at: new Date().toISOString(),
    }).eq('id', contract_id),
    supabase.from('notifications').insert({
      user_id: contract.freelancer_id,
      title: 'Payment approved! 💰',
      message: `₹${freelancerPayout.toLocaleString()} will be transferred to your bank account within 2–3 business days.`,
      type: 'payment',
      link: `/payouts`,
    }),
    supabase.from('notifications').insert({
      user_id: user.id,
      title: 'Payment released',
      message: `₹${freelancerPayout.toLocaleString()} released to freelancer. Transfer in progress.`,
      type: 'payment',
      link: `/contracts/${contract_id}`,
    }),
  ])

  supabase.rpc('increment_freelancer_earnings' as never, {
    uid: contract.freelancer_id,
    amount: freelancerPayout,
  } as never)

  return NextResponse.json({
    success: true,
    freelancer_payout: freelancerPayout,
    platform_fee: platformFee,
  })
}

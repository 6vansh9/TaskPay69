import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const PLATFORM_FEE_PCT = 0.10

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { contract_id } = await request.json()
  if (!contract_id) return NextResponse.json({ error: 'contract_id required' }, { status: 400 })

  const { data: raw } = await supabase
    .from('contracts')
    .select('id, client_id, freelancer_id, amount, razorpay_payment_id')
    .eq('id', contract_id)
    .single()

  const contract = raw as {
    id: string; client_id: string; freelancer_id: string
    amount: number | null; razorpay_payment_id: string | null
  } | null

  if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
  if (contract.client_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (contract.razorpay_payment_id) return NextResponse.json({ already_funded: true })

  const simPaymentId = `sim_${Date.now()}`
  const amount = contract.amount ?? 0
  const platformFee = Math.round(amount * PLATFORM_FEE_PCT * 100) / 100
  const netAmount = amount - platformFee

  await Promise.all([
    supabase.from('contracts').update({ razorpay_payment_id: simPaymentId }).eq('id', contract_id),
    supabase.from('transactions').insert({
      contract_id,
      payer_id: user.id,
      payee_id: contract.freelancer_id,
      amount,
      platform_fee: platformFee,
      net_amount: netAmount,
      type: 'escrow_fund',
      status: 'held',
      payment_ref: simPaymentId,
    }),
    supabase.from('notifications').insert({
      user_id: contract.freelancer_id,
      title: '🎉 Escrow funded. Start working!',
      message: `Client has deposited ₹${amount.toLocaleString()} into escrow. You can start working on the project.`,
      type: 'payment',
      link: `/contracts/${contract_id}`,
    }),
  ])

  return NextResponse.json({ success: true, payment_id: simPaymentId })
}

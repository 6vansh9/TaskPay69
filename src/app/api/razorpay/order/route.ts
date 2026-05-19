import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { razorpay, isRazorpayReady } from '@/lib/razorpay'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { contract_id } = await request.json()
  if (!contract_id) return NextResponse.json({ error: 'contract_id required' }, { status: 400 })

  const { data: raw } = await supabase
    .from('contracts')
    .select('id, client_id, freelancer_id, amount, razorpay_order_id, razorpay_payment_id')
    .eq('id', contract_id)
    .single()

  const contract = raw as {
    id: string; client_id: string; amount: number | null
    razorpay_order_id: string | null; razorpay_payment_id: string | null
  } | null

  if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
  if (contract.client_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Already paid — return existing order info so frontend can re-open if needed
  if (contract.razorpay_payment_id) {
    return NextResponse.json({ already_paid: true })
  }

  const amountPaise = Math.round((contract.amount ?? 0) * 100)
  if (amountPaise < 100) return NextResponse.json({ error: 'Amount too small (min ₹1)' }, { status: 400 })

  // Razorpay not configured — sandbox mode: mark as funded immediately
  if (!isRazorpayReady() || !razorpay) {
    await supabase.from('contracts').update({ razorpay_payment_id: 'sandbox_mock' }).eq('id', contract_id)
    await supabase.from('transactions').insert({
      contract_id,
      payer_id: user.id,
      payee_id: contract.client_id, // will fix on verify
      amount: contract.amount,
      platform_fee: 0,
      net_amount: contract.amount,
      type: 'escrow_fund',
      status: 'completed',
      payment_ref: 'sandbox_mock',
    })
    return NextResponse.json({ sandbox: true })
  }

  const order = await razorpay.orders.create({
    amount: amountPaise,
    currency: 'INR',
    receipt: `contract_${contract_id.slice(0, 16)}`,
    notes: { contract_id },
  })

  await supabase.from('contracts').update({ razorpay_order_id: order.id }).eq('id', contract_id)

  return NextResponse.json({
    order_id: order.id,
    amount: amountPaise,
    currency: 'INR',
    key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  })
}

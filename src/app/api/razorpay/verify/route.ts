import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyPaymentSignature, PLATFORM_FEE_PCT } from '@/lib/razorpay'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, contract_id } = await request.json()

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !contract_id) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Verify signature
  const valid = verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 })
  }

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
  if (contract.razorpay_payment_id) return NextResponse.json({ already_paid: true })

  const amount = contract.amount ?? 0
  const platformFee = Math.round(amount * PLATFORM_FEE_PCT * 100) / 100
  const netAmount = amount - platformFee

  await Promise.all([
    supabase.from('contracts').update({
      razorpay_order_id,
      razorpay_payment_id,
    }).eq('id', contract_id),
    supabase.from('transactions').insert({
      contract_id,
      payer_id: user.id,
      payee_id: contract.freelancer_id,
      amount,
      platform_fee: platformFee,
      net_amount: netAmount,
      type: 'escrow_fund',
      status: 'completed',
      payment_ref: razorpay_payment_id,
    }),
    supabase.from('notifications').insert({
      user_id: user.id,
      title: 'Escrow funded ✓',
      message: `₹${amount.toLocaleString()} is now held in escrow.`,
      type: 'payment',
      link: `/contracts/${contract_id}`,
    }),
    supabase.from('notifications').insert({
      user_id: contract.freelancer_id,
      title: 'Client has funded escrow',
      message: `Payment of ₹${amount.toLocaleString()} is secured. Get to work!`,
      type: 'payment',
      link: `/contracts/${contract_id}`,
    }),
  ])

  return NextResponse.json({ success: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature, PLATFORM_FEE_PCT } from '@/lib/razorpay'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-razorpay-signature') ?? ''

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  let event: { event: string; payload: Record<string, unknown> }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const supabase = await createClient()

  switch (event.event) {
    case 'payment.captured': {
      const payment = (event.payload as { payment?: { entity?: Record<string, unknown> } })
        ?.payment?.entity
      if (!payment) break
      const contractId = (payment.notes as Record<string, string> | null)?.contract_id
      if (!contractId) break

      const amount = (payment.amount as number ?? 0) / 100
      const platformFee = Math.round(amount * PLATFORM_FEE_PCT * 100) / 100

      const { data: contract } = await supabase
        .from('contracts')
        .select('client_id, freelancer_id, razorpay_payment_id')
        .eq('id', contractId).single()
      const c = contract as { client_id: string; freelancer_id: string; razorpay_payment_id: string | null } | null

      // Only record if not already recorded via verify endpoint
      if (!c?.razorpay_payment_id) {
        await Promise.all([
          supabase.from('contracts').update({ razorpay_payment_id: payment.id as string }).eq('id', contractId),
          supabase.from('transactions').insert({
            contract_id: contractId,
            payer_id: c?.client_id,
            payee_id: c?.freelancer_id,
            amount,
            platform_fee: platformFee,
            net_amount: amount - platformFee,
            type: 'escrow_fund',
            status: 'completed',
            payment_ref: payment.id as string,
          }),
        ])
      }
      break
    }

    case 'payment.failed': {
      const payment = (event.payload as { payment?: { entity?: Record<string, unknown> } })
        ?.payment?.entity
      const contractId = (payment?.notes as Record<string, string> | null)?.contract_id
      const clientId   = (payment?.notes as Record<string, string> | null)?.client_id
      if (contractId && clientId) {
        await supabase.from('notifications').insert({
          user_id: clientId,
          title: 'Payment failed',
          message: 'Your escrow payment could not be processed. Please try again.',
          type: 'payment',
          link: `/contracts/${contractId}`,
        })
      }
      break
    }

    default:
      break
  }

  return NextResponse.json({ received: true })
}

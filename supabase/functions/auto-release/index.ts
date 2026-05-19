// Supabase Edge Function — scheduled hourly via cron
// Auto-releases escrow for contracts delivered 7+ days ago with no client response.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const PLATFORM_FEE_PCT  = 0.10
const AUTO_RELEASE_DAYS = 7

Deno.serve(async () => {
  const cutoff = new Date(Date.now() - AUTO_RELEASE_DAYS * 24 * 60 * 60 * 1000).toISOString()

  // Contracts in 'delivered' status, funded (razorpay_payment_id set), older than cutoff
  const { data: contracts, error } = await supabase
    .from('contracts')
    .select('id, client_id, freelancer_id, amount, razorpay_payment_id, updated_at')
    .eq('status', 'delivered')
    .lt('updated_at', cutoff)
    .not('razorpay_payment_id', 'is', null)

  if (error) {
    console.error('Query error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  let released = 0
  for (const contract of contracts ?? []) {
    try {
      // Skip if release already recorded
      const { data: existing } = await supabase
        .from('transactions')
        .select('id')
        .eq('contract_id', contract.id)
        .eq('type', 'escrow_release')
        .maybeSingle()
      if (existing) continue

      const amount       = (contract as { amount: number }).amount ?? 0
      const platformFee  = Math.round(amount * PLATFORM_FEE_PCT * 100) / 100
      const freelancerNet = amount - platformFee

      await Promise.all([
        supabase.from('transactions').insert({
          contract_id:  contract.id,
          payer_id:     contract.client_id,
          payee_id:     contract.freelancer_id,
          amount,
          platform_fee: platformFee,
          net_amount:   freelancerNet,
          type:         'escrow_release',
          status:       'pending_transfer',
          payment_ref:  (contract as { razorpay_payment_id: string }).razorpay_payment_id,
        }),
        supabase.from('contracts').update({
          status:       'complete',
          completed_at: new Date().toISOString(),
        }).eq('id', contract.id),
        supabase.from('notifications').insert([
          {
            user_id: contract.client_id,
            title:   'Auto-release triggered',
            message: `Payment auto-released after ${AUTO_RELEASE_DAYS} days — contract marked complete.`,
            type:    'payment',
            link:    `/contracts/${contract.id}`,
          },
          {
            user_id: contract.freelancer_id,
            title:   'Payment approved! 💰',
            message: `₹${freelancerNet.toLocaleString()} auto-approved. Request a bank transfer from your payout dashboard.`,
            type:    'payment',
            link:    `/payouts`,
          },
        ]),
      ])

      released++
      console.log(`Auto-released contract ${contract.id}: ₹${freelancerNet}`)
    } catch (err) {
      console.error(`Failed for contract ${contract.id}:`, err)
    }
  }

  return new Response(
    JSON.stringify({ checked: contracts?.length ?? 0, released }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})

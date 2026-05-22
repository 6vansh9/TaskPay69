// Supabase Edge Function — scheduled monthly on the 1st at 00:00 UTC
// Refills every freelancer's connects balance by +10 (capped at a reasonable max)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const REFILL_AMOUNT = 10
const MAX_BALANCE   = 80

Deno.serve(async () => {
  // Add +10 connects to all freelancers, capped at MAX_BALANCE
  const { data: freelancers, error } = await supabase
    .from('profiles')
    .select('id, connects_balance')
    .eq('role', 'freelancer')
    .eq('onboarding_complete', true)

  if (error) {
    console.error('Query error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  let refilled = 0

  for (const profile of freelancers ?? []) {
    const current = (profile as { connects_balance: number }).connects_balance ?? 0
    const newBalance = Math.min(current + REFILL_AMOUNT, MAX_BALANCE)

    if (newBalance === current) continue

    await Promise.all([
      supabase.from('profiles').update({ connects_balance: newBalance }).eq('id', profile.id),
      supabase.from('connects_transactions').insert({
        user_id: profile.id,
        amount:  newBalance - current,
        type:    'monthly_refill',
        note:    `Monthly refill — ${new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })}`,
      }),
      supabase.from('notifications').insert({
        user_id: profile.id,
        title:   'Monthly connects refilled! ⚡',
        message: `+${newBalance - current} connects added. You now have ${newBalance} connects. Happy bidding!`,
        type:    'system',
        link:    '/connects',
      }),
    ])

    refilled++
    console.log(`Refilled ${profile.id}: ${current} → ${newBalance}`)
  }

  return new Response(
    JSON.stringify({ checked: freelancers?.length ?? 0, refilled }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})

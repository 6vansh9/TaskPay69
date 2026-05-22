import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const [
    { count: freelancers },
    { count: jobs },
    { data: paidRaw },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true })
      .eq('role', 'freelancer').eq('onboarding_complete', true),
    supabase.from('jobs').select('*', { count: 'exact', head: true }),
    supabase.from('transactions').select('net_amount').eq('type', 'escrow_release'),
  ])

  const paidOut = (paidRaw ?? []).reduce((sum, t) => sum + ((t as { net_amount: number }).net_amount ?? 0), 0)

  return NextResponse.json({
    freelancers: freelancers ?? 0,
    jobs: jobs ?? 0,
    paid_out: paidOut,
  })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('transactions')
    .select(`id, type, status, amount, platform_fee, net_amount, payment_ref, payout_details, payer_id, payee_id, contract_id, created_at, contract:contract_id(id, job:job_id(title))`)
    .or(`payer_id.eq.${user.id},payee_id.eq.${user.id}`)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

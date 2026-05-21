import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single()
  if ((profile as { role: string } | null)?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const { amount, payment_method, upi_id, account_number, ifsc, account_name } = body

  if (!amount || Number(amount) <= 0) {
    return NextResponse.json({ error: 'Valid amount required' }, { status: 400 })
  }
  if (!payment_method || !['upi', 'bank'].includes(payment_method)) {
    return NextResponse.json({ error: 'payment_method must be upi or bank' }, { status: 400 })
  }
  if (payment_method === 'upi' && !upi_id) {
    return NextResponse.json({ error: 'UPI ID required' }, { status: 400 })
  }
  if (payment_method === 'bank' && (!account_number || !ifsc || !account_name)) {
    return NextResponse.json({ error: 'account_number, ifsc, and account_name required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('admin_withdrawals').insert({
    admin_id: user.id,
    amount: Number(amount),
    payment_method,
    upi_id: upi_id ?? null,
    account_number: account_number ?? null,
    ifsc: ifsc ?? null,
    account_name: account_name ?? null,
    status: 'completed',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabaseAdmin.from('audit_log').insert({
    admin_id: user.id,
    action: 'admin_withdrawal',
    target_id: user.id,
    details: { amount, payment_method, upi_id: upi_id ?? null, account_number: account_number ?? null },
  })

  return NextResponse.json({ success: true, message: `₹${Number(amount).toLocaleString('en-IN')} withdrawal recorded.` })
}

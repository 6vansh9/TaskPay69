import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendWithdrawalPaidEmail } from '@/lib/email'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: adminProfile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single()
  if ((adminProfile as { role: string } | null)?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const action = (body.action as string) ?? 'mark_paid'
  const reason = (body.reason as string) ?? ''

  const { data: tx, error: fetchErr } = await supabaseAdmin
    .from('transactions')
    .select('id, type, status, amount, net_amount, payee_id, payout_details, payee:payee_id(id, full_name, email, bank_account)')
    .eq('id', id)
    .in('type', ['escrow_release', 'payout'])
    .single()

  if (fetchErr || !tx) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const txStatus = (tx as { status: string }).status
  const txType   = (tx as { type: string }).type

  if (!['pending_transfer', 'pending'].includes(txStatus)) {
    return NextResponse.json({ error: 'Already processed' }, { status: 409 })
  }

  const payee = (tx as unknown as {
    payee: { id: string; full_name: string; email: string; bank_account: Record<string, string> } | null
  }).payee
  const amount       = (tx as { amount: number }).amount
  const netAmount    = (tx as { net_amount: number }).net_amount
  const payoutDetails = (tx as { payout_details: Record<string, string> | null }).payout_details

  // ── REJECT ──────────────────────────────────────────────────────────
  if (action === 'reject') {
    // For escrow_release: use 'on_hold' — money is owed to freelancer, not permanently failed
    const rejectStatus = txType === 'escrow_release' ? 'on_hold' : 'failed'
    const { error: updErr } = await supabaseAdmin
      .from('transactions').update({ status: rejectStatus }).eq('id', id)
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

    await supabaseAdmin.from('notifications').insert({
      user_id: payee?.id,
      title: 'Payout on hold',
      message: reason
        ? `Your payout of ₹${netAmount.toLocaleString('en-IN')} is on hold: ${reason}`
        : `Your payout of ₹${netAmount.toLocaleString('en-IN')} is temporarily on hold. Contact support.`,
      type: 'payment',
      link: '/payouts',
    })

    await supabaseAdmin.from('audit_log').insert({
      admin_id: user.id,
      action: 'payout_rejected',
      target_id: id,
      details: { amount, netAmount, payee_id: payee?.id, reason },
    })

    return NextResponse.json({ success: true })
  }

  // ── MARK PAID ────────────────────────────────────────────────────────
  // escrow_release → 'paid_out'; explicit payout request → 'completed'
  const newStatus = txType === 'escrow_release' ? 'paid_out' : 'completed'
  const { error: updErr } = await supabaseAdmin
    .from('transactions').update({ status: newStatus }).eq('id', id)
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  // When escrow_release is paid out, also complete any pending payout requests for this payee
  if (txType === 'escrow_release' && payee?.id) {
    await supabaseAdmin
      .from('transactions')
      .update({ status: 'completed' })
      .eq('payee_id', payee.id)
      .eq('type', 'payout')
      .eq('status', 'pending')
  }

  // Determine payment method string for email/notifications
  const bankAccount = payoutDetails ?? (payee?.bank_account ?? {})
  const method = (bankAccount as { payment_method?: string }).payment_method === 'upi' || (bankAccount as { upi_id?: string }).upi_id
    ? `UPI (${(bankAccount as { upi_id?: string }).upi_id ?? ''})`
    : (bankAccount as { account_number?: string }).account_number
      ? `Bank (XXXX${String((bankAccount as { account_number?: string }).account_number).slice(-4)})`
      : 'Bank Transfer'

  // Email is non-critical — don't let it fail the whole request
  if (payee?.email) {
    sendWithdrawalPaidEmail({
      freelancerEmail: payee.email,
      freelancerName: payee.full_name ?? 'Freelancer',
      amount: netAmount,
      method,
    }).catch(() => {})
  }

  await supabaseAdmin.from('notifications').insert({
    user_id: payee?.id,
    title: 'Payout processed',
    message: `✅ Your payout of ₹${netAmount.toLocaleString('en-IN')} has been processed!`,
    type: 'payment',
    link: '/payouts',
  })

  await supabaseAdmin.from('audit_log').insert({
    admin_id: user.id,
    action: 'payout_marked_paid',
    target_id: id,
    details: { amount, netAmount, payee_id: payee?.id, method },
  })

  return NextResponse.json({ success: true })
}

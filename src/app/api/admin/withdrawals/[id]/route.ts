import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendWithdrawalPaidEmail } from '@/lib/email'

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if ((profile as { role: string } | null)?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const { data: tx } = await supabase
    .from('transactions')
    .select(`*, payee:payee_id(id, full_name, email, bank_account)`)
    .eq('id', id)
    .eq('type', 'payout')
    .single()

  if (!tx) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if ((tx as { status: string }).status !== 'pending') {
    return NextResponse.json({ error: 'Already processed' }, { status: 409 })
  }

  await supabase.from('transactions').update({ status: 'completed' }).eq('id', id)

  const payee = (tx as unknown as { payee: { id: string; full_name: string; email: string; bank_account: Record<string, string> } | null }).payee
  const amount = (tx as { amount: number }).amount

  if (payee?.email) {
    const bankAccount = payee.bank_account ?? {}
    const method = bankAccount.upi_id
      ? `UPI (${bankAccount.upi_id})`
      : bankAccount.account_number
        ? `Bank (XXXX${String(bankAccount.account_number).slice(-4)})`
        : 'Bank Transfer'

    await sendWithdrawalPaidEmail({
      freelancerEmail: payee.email,
      freelancerName: payee.full_name ?? 'Freelancer',
      amount,
      method,
    })
  }

  await supabase.from('notifications').insert({
    user_id: payee?.id,
    title: 'Payout processed',
    message: `Your withdrawal of ₹${amount.toLocaleString()} has been processed.`,
    type: 'payment',
    link: '/payouts',
  })

  return NextResponse.json({ success: true })
}

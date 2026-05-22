import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const PACKAGES = {
  starter: { connects: 20,  price: 199,  label: 'Starter'  },
  popular: { connects: 60,  price: 499,  label: 'Popular'  },
  pro:     { connects: 150, price: 999,  label: 'Pro'       },
} as const

type PackageKey = keyof typeof PACKAGES

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const pkg = body.package as PackageKey | undefined
  if (!pkg || !(pkg in PACKAGES)) {
    return NextResponse.json({ error: 'Invalid package' }, { status: 400 })
  }

  const { connects, label } = PACKAGES[pkg]

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, connects_balance')
    .eq('id', user.id)
    .single()

  if ((profile as { role: string } | null)?.role !== 'freelancer') {
    return NextResponse.json({ error: 'Only freelancers can purchase connects' }, { status: 403 })
  }

  const current = (profile as { connects_balance: number } | null)?.connects_balance ?? 0
  const newBalance = current + connects

  const [{ error: updateErr }] = await Promise.all([
    supabase.from('profiles').update({ connects_balance: newBalance }).eq('id', user.id),
    supabase.from('connects_transactions').insert({
      user_id: user.id,
      type: 'purchase',
      amount: connects,
      package: pkg,
      description: `${label} pack — ${connects} connects`,
    }),
    supabase.from('notifications').insert({
      user_id: user.id,
      title: `${connects} connects added!`,
      message: `Your ${label} pack has been applied. Balance: ${newBalance} connects.`,
      type: 'payment',
      link: '/connects',
    }),
  ])

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  return NextResponse.json({ success: true, new_balance: newBalance, added: connects })
}

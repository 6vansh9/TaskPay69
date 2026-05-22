'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { Zap, ChevronRight, Check, ArrowDownLeft, ArrowUpRight, Clock, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Transaction {
  id: string
  type: 'purchase' | 'spent'
  amount: number
  description: string | null
  package: string | null
  created_at: string
}

const PACKAGES = [
  {
    key: 'starter' as const,
    label: 'Starter',
    connects: 20,
    price: 199,
    perConnect: '₹9.95',
    features: ['20 connects', 'Never expire', 'Good for 10 proposals'],
    highlight: false,
  },
  {
    key: 'popular' as const,
    label: 'Popular',
    connects: 60,
    price: 499,
    perConnect: '₹8.32',
    features: ['60 connects', 'Never expire', 'Good for 30 proposals', '16% cheaper per connect'],
    highlight: true,
  },
  {
    key: 'pro' as const,
    label: 'Pro',
    connects: 150,
    price: 999,
    perConnect: '₹6.66',
    features: ['150 connects', 'Never expire', 'Good for 75 proposals', '33% cheaper per connect'],
    highlight: false,
  },
]

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ConnectsPage() {
  const router = useRouter()
  const [balance, setBalance] = useState<number | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [loadingTx, setLoadingTx] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/auth/login?next=/connects'); return }

      const [{ data: profile }, { data: txs }] = await Promise.all([
        supabase.from('profiles').select('role, connects_balance').eq('id', user.id).single(),
        supabase
          .from('connects_transactions')
          .select('id, type, amount, description, package, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(30),
      ])

      const p = profile as { role: string; connects_balance: number } | null
      if (p?.role === 'client') { router.push('/dashboard'); return }

      setBalance(p?.connects_balance ?? 0)
      setTransactions((txs ?? []) as Transaction[])
      setLoadingTx(false)
    })
  }, [router])

  const handlePurchase = async (pkg: typeof PACKAGES[number]) => {
    setPurchasing(pkg.key)
    try {
      const res = await fetch('/api/connects/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package: pkg.key }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Purchase failed'); return }

      setBalance(data.new_balance)
      const newTx: Transaction = {
        id: crypto.randomUUID(),
        type: 'purchase',
        amount: data.added,
        description: `${pkg.label} pack — ${pkg.connects} connects`,
        package: pkg.key,
        created_at: new Date().toISOString(),
      }
      setTransactions(prev => [newTx, ...prev])
      toast.success(`${data.added} connects added! Balance: ${data.new_balance}`)
    } finally {
      setPurchasing(null)
    }
  }

  const loading = balance === null

  return (
    <div className="flex flex-col min-h-screen bg-card">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">

        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-4 flex items-center gap-1">
          <Link href="/dashboard" className="hover:text-[#14a800]">Dashboard</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground">Connects</span>
        </nav>

        {/* ── Balance hero ──────────────────────────────────────────── */}
        <div className="card p-6 mb-6 relative overflow-hidden">
          {/* Background glow */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-[#14a800]/8 rounded-full blur-2xl pointer-events-none" />

          <div className="relative flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium text-muted-foreground">Current Balance</span>
              </div>
              {loading ? (
                <div className="skeleton h-12 w-32 rounded-xl" />
              ) : (
                <div className="flex items-end gap-3">
                  <span className="text-5xl font-extrabold text-foreground tabular-nums">{balance}</span>
                  <span className="text-lg text-muted-foreground mb-1.5 font-medium">connects</span>
                </div>
              )}
              <p className="text-sm text-muted-foreground mt-2">
                Connects are used to submit proposals. Most jobs cost 2–6 connects.
              </p>
            </div>

            <div className="flex flex-col gap-2 text-right">
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl px-4 py-2.5">
                <p className="text-xs text-muted-foreground">Approx. proposals left</p>
                <p className="text-2xl font-bold text-purple-400 tabular-nums">
                  {loading ? '…' : Math.floor((balance ?? 0) / 3)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Packages ──────────────────────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-[#14a800]" />
            <h2 className="font-semibold text-foreground">Buy Connects</h2>
          </div>

          {/* Test mode banner */}
          <div className="bg-amber-500/8 border border-amber-500/25 rounded-xl px-4 py-2.5 mb-5 flex items-center gap-2">
            <span className="text-amber-400 text-xs font-bold tracking-widest uppercase">⚠ Demo Mode</span>
            <span className="text-amber-400/70 text-xs">— Purchases are simulated, no real payment is charged</span>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {PACKAGES.map(pkg => (
              <div
                key={pkg.key}
                className={cn(
                  'relative card p-5 flex flex-col transition-all',
                  pkg.highlight
                    ? 'border-[#14a800]/50 bg-[#14a800]/[.04] ring-1 ring-[#14a800]/20'
                    : 'hover:border-[#14a800]/30',
                )}
              >
                {pkg.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-[#14a800] text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  <p className="text-sm font-semibold text-muted-foreground mb-1">{pkg.label}</p>
                  <div className="flex items-end gap-1 mb-1">
                    <span className="text-3xl font-extrabold text-foreground">₹{pkg.price}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-lg font-bold text-purple-400">{pkg.connects}</span>
                    <span className="text-sm text-muted-foreground">connects</span>
                  </div>
                  <p className="text-xs text-[var(--faint)] mt-1">{pkg.perConnect} per connect</p>
                </div>

                <ul className="space-y-1.5 mb-5 flex-1">
                  {pkg.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Check className="w-3.5 h-3.5 text-[#14a800] flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handlePurchase(pkg)}
                  disabled={purchasing !== null}
                  className={cn(
                    'btn w-full',
                    pkg.highlight ? 'btn-primary' : 'btn-secondary',
                    purchasing === pkg.key && 'opacity-70 cursor-not-allowed',
                  )}
                >
                  {purchasing === pkg.key ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Adding…
                    </span>
                  ) : (
                    `Buy for ₹${pkg.price}`
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Transaction history ───────────────────────────────────── */}
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-semibold text-foreground">Transaction History</h2>
            </div>
            {transactions.length > 0 && (
              <span className="text-xs text-muted-foreground">{transactions.length} transaction{transactions.length !== 1 ? 's' : ''}</span>
            )}
          </div>

          {loadingTx ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <div className="skeleton w-9 h-9 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <div className="skeleton h-4 w-48" />
                    <div className="skeleton h-3 w-24" />
                  </div>
                  <div className="skeleton h-5 w-16" />
                </div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-14 text-center">
              <Zap className="w-10 h-10 text-[var(--faint)] mx-auto mb-3" />
              <p className="font-semibold text-foreground mb-1">No transactions yet</p>
              <p className="text-sm text-muted-foreground">Purchases and proposal spends will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {transactions.map(tx => {
                const isPurchase = tx.type === 'purchase'
                return (
                  <div key={tx.id} className="flex items-center gap-4 px-5 py-3.5">
                    <div className={cn(
                      'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0',
                      isPurchase ? 'bg-[#14a800]/10' : 'bg-red-500/10',
                    )}>
                      {isPurchase
                        ? <ArrowDownLeft className="w-4 h-4 text-[#14a800]" />
                        : <ArrowUpRight className="w-4 h-4 text-red-400" />
                      }
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {tx.description ?? (isPurchase ? 'Connects purchased' : 'Proposal submitted')}
                      </p>
                      <p className="text-xs text-muted-foreground">{timeAgo(tx.created_at)}</p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className={cn(
                        'text-sm font-bold tabular-nums',
                        isPurchase ? 'text-[#14a800]' : 'text-red-400',
                      )}>
                        {isPurchase ? '+' : '−'}{tx.amount}
                      </span>
                      <p className="text-[10px] text-muted-foreground">
                        {isPurchase ? 'added' : 'spent'}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </main>
      <Footer />
    </div>
  )
}

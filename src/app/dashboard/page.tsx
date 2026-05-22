import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import VerificationNudge from '@/components/verification/VerificationNudge'
import Link from 'next/link'
import {
  Briefcase, DollarSign, Star, FileText, Users, Clock,
  Plus, ChevronRight, CheckCircle2, AlertCircle, Zap,
  TrendingUp, Target, BarChart2, Bookmark,
} from 'lucide-react'
import type { Profile } from '@/types/database'
import EarningsChart from '@/components/dashboard/EarningsChart'
import SpendingChart from '@/components/dashboard/SpendingChart'

function timeAgoServer(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function groupByWeek(txns: { created_at: string; net_amount: number }[]) {
  const now = new Date()
  return Array.from({ length: 8 }, (_, i) => {
    const start = new Date(now); start.setDate(now.getDate() - (7 - i) * 7)
    const end   = new Date(start); end.setDate(start.getDate() + 7)
    const amount = txns.filter(t => { const d = new Date(t.created_at); return d >= start && d < end })
                       .reduce((s, t) => s + (t.net_amount ?? 0), 0)
    return { label: `W${i + 1}`, amount }
  })
}

function groupByMonth(txns: { created_at: string; net_amount: number }[]) {
  const now = new Date()
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const amount = txns.filter(t => {
      const td = new Date(t.created_at)
      return td.getFullYear() === d.getFullYear() && td.getMonth() === d.getMonth()
    }).reduce((s, t) => s + (t.net_amount ?? 0), 0)
    return { label: d.toLocaleString('default', { month: 'short' }), amount }
  })
}

function groupSpendByMonth(txns: { created_at: string; amount: number }[]) {
  const now = new Date()
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const amount = txns.filter(t => {
      const td = new Date(t.created_at)
      return td.getFullYear() === d.getFullYear() && td.getMonth() === d.getMonth()
    }).reduce((s, t) => s + (t.amount ?? 0), 0)
    return { label: d.toLocaleString('default', { month: 'short' }), amount }
  })
}

function calcProfileComplete(profile: Profile & {
  edu_verified?: boolean; phone_verified?: boolean
  work_experience?: unknown; portfolio?: unknown
}) {
  let score = 0
  if (profile.full_name)         score += 10
  if (profile.avatar_url)        score += 15
  if (profile.title)             score += 15
  if (profile.bio)               score += 15
  if (profile.skills?.length)    score += 15
  if (profile.hourly_rate)       score += 10
  if (profile.location)          score +=  5
  if (profile.edu_verified)      score +=  8
  if (profile.phone_verified)    score +=  5
  if (profile.work_experience && JSON.stringify(profile.work_experience) !== '[]' && JSON.stringify(profile.work_experience) !== 'null') score += 2
  return Math.min(score, 100)
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: rawProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const profile = rawProfile as Profile | null
  if (!profile) { redirect('/auth/login'); return null }

  if (!(profile as unknown as { onboarding_complete: boolean }).onboarding_complete) {
    redirect(`/onboarding/${profile.role === 'client' ? 'client' : 'freelancer'}`)
  }

  const isFreelancer = profile.role === 'freelancer'
  const p = profile as unknown as {
    jobs_completed: number; total_earnings: number; rating: number
    connects_balance: number; jobs_posted: number; total_spent: number
    phone_verified: boolean; edu_verified: boolean; role: string
    full_name: string | null; company_name: string | null
    skills: string[] | null
  }
  const displayName = p.full_name?.split(' ')[0] ?? p.company_name ?? 'there'

  // ── Freelancer data ───────────────────────────────────────────
  let freelancerContracts: {
    id: string; status: string; created_at: string; amount: number | null
    job: { title: string } | null; freelancer: { full_name: string | null } | null
  }[] = []
  let freelancerNotifications: { id: string; title: string; created_at: string; type: string; link: string | null }[] = []
  let earningsTxns: { created_at: string; net_amount: number }[] = []
  let proposalStats = { total: 0, hired: 0 }
  let jobAlerts: { id: string; title: string; budget_min: number | null; budget_max: number | null; budget_type: string; created_at: string }[] = []

  if (isFreelancer) {
    const freelancerSkills = p.skills ?? []
    const [
      { data: fContracts },
      { data: fNotifs },
      { data: earningsRaw },
      { count: totalProps },
      { count: hiredProps },
      { data: alertJobs },
    ] = await Promise.all([
      supabase.from('contracts')
        .select('id, status, created_at, amount, job:jobs(title), freelancer:profiles!contracts_freelancer_id_fkey(full_name)')
        .eq('freelancer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase.from('notifications').select('id, title, created_at, type, link').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('transactions').select('created_at, net_amount')
        .eq('payee_id', user.id).eq('type', 'escrow_release')
        .order('created_at', { ascending: true }),
      supabase.from('proposals').select('*', { count: 'exact', head: true }).eq('freelancer_id', user.id),
      supabase.from('proposals').select('*', { count: 'exact', head: true }).eq('freelancer_id', user.id).eq('status', 'hired'),
      freelancerSkills.length > 0
        ? supabase.from('jobs').select('id, title, budget_min, budget_max, budget_type, created_at')
            .eq('status', 'open')
            .overlaps('skills', freelancerSkills)
            .order('created_at', { ascending: false })
            .limit(4)
        : supabase.from('jobs').select('id, title, budget_min, budget_max, budget_type, created_at')
            .eq('status', 'open')
            .order('created_at', { ascending: false })
            .limit(4),
    ])
    freelancerContracts = (fContracts ?? []) as unknown as typeof freelancerContracts
    freelancerNotifications = (fNotifs ?? []) as unknown as typeof freelancerNotifications
    earningsTxns = (earningsRaw ?? []) as unknown as typeof earningsTxns
    proposalStats = { total: totalProps ?? 0, hired: hiredProps ?? 0 }
    jobAlerts = (alertJobs ?? []) as unknown as typeof jobAlerts
  }

  // ── Client data ───────────────────────────────────────────────
  let clientStats = { activeJobs: 0, totalSpent: 0, freelancersHired: 0, pendingApprovals: 0, completedJobs: 0, avgHireDays: 0 }
  let recentJobs: { id: string; title: string; status: string; created_at: string; proposals_count: number }[] = []
  let recentContracts: typeof freelancerContracts = []
  let recentNotifications: typeof freelancerNotifications = []
  let spendTxns: { created_at: string; amount: number }[] = []
  let savedFreelancers: { id: string; full_name: string | null; avatar_url: string | null; title: string | null; rating: number }[] = []

  if (!isFreelancer) {
    const [
      { count: activeJobs },
      { count: pendingApprovals },
      { count: completedJobs },
      { data: contractsRaw },
      { data: jobsRaw },
      { data: notifs },
      { data: spendRaw },
    ] = await Promise.all([
      supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('client_id', user.id).eq('status', 'open'),
      supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('client_id', user.id).eq('status', 'delivered'),
      supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('client_id', user.id).eq('status', 'complete'),
      supabase.from('contracts')
        .select('id, status, created_at, amount, freelancer_id, job:jobs(title), freelancer:profiles!contracts_freelancer_id_fkey(full_name)')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase.from('jobs').select('id, title, status, created_at, proposals_count').eq('client_id', user.id).order('created_at', { ascending: false }).limit(4),
      supabase.from('notifications').select('id, title, created_at, type, link').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('transactions').select('created_at, amount')
        .eq('payer_id', user.id).eq('type', 'escrow_release')
        .order('created_at', { ascending: true }),
    ])

    const allContracts = (contractsRaw ?? []) as unknown as { freelancer_id: string | null; amount: number | null; created_at: string }[]
    const uniqueFreelancerIds = [...new Set(allContracts.map(c => c.freelancer_id).filter(Boolean))] as string[]

    // Total spent from transactions
    const { data: spentRaw } = await supabase.from('transactions').select('amount').eq('payer_id', user.id).eq('type', 'escrow_release')
    const totalSpent = (spentRaw ?? []).reduce((sum, t) => sum + ((t as { amount: number }).amount ?? 0), 0)

    // Saved freelancers
    const { data: savedFLRows } = await supabase
      .from('saved_freelancers')
      .select('freelancer_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(4)
    const savedFLIds = (savedFLRows ?? []).map(r => r.freelancer_id as string)
    let savedFLProfiles: typeof savedFreelancers = []
    if (savedFLIds.length > 0) {
      const { data: flRaw } = await supabase
        .from('profiles').select('id, full_name, avatar_url, title, rating').in('id', savedFLIds)
      const flMap = new Map((flRaw ?? []).map((f: typeof savedFreelancers[number]) => [f.id, f]))
      savedFLProfiles = savedFLIds.map(fid => flMap.get(fid)).filter(Boolean) as typeof savedFreelancers
    }

    // Avg time to hire: median days from job creation to first contract
    const jobIds = (jobsRaw ?? []).map(j => j.id)
    let avgHireDays = 0
    if (jobIds.length > 0) {
      const { data: contractTimes } = await supabase.from('contracts')
        .select('created_at, job_id:jobs!contracts_job_id_fkey(created_at)')
        .eq('client_id', user.id)
        .in('job_id', jobIds)
        .limit(20)
      const diffs = ((contractTimes ?? []) as unknown as { created_at: string; job_id: { created_at: string } | null }[])
        .filter(c => c.job_id?.created_at)
        .map(c => Math.floor((new Date(c.created_at).getTime() - new Date(c.job_id!.created_at).getTime()) / 86400000))
        .filter(d => d >= 0)
      avgHireDays = diffs.length > 0 ? Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length) : 0
    }

    clientStats = {
      activeJobs: activeJobs ?? 0,
      totalSpent,
      freelancersHired: uniqueFreelancerIds.length,
      pendingApprovals: pendingApprovals ?? 0,
      completedJobs: completedJobs ?? 0,
      avgHireDays,
    }
    recentJobs = (jobsRaw ?? []) as unknown as typeof recentJobs
    recentContracts = (contractsRaw ?? []) as unknown as typeof recentContracts
    recentNotifications = (notifs ?? []) as unknown as typeof recentNotifications
    spendTxns = (spendRaw ?? []) as unknown as typeof spendTxns
    savedFreelancers = savedFLProfiles
  }

  // ── Derived ───────────────────────────────────────────────────
  const profileComplete = isFreelancer ? calcProfileComplete(profile as Parameters<typeof calcProfileComplete>[0]) : 0
  const successRate = proposalStats.total > 0 ? Math.round((proposalStats.hired / proposalStats.total) * 100) : 0
  const earningsWeekly  = groupByWeek(earningsTxns)
  const earningsMonthly = groupByMonth(earningsTxns)
  const spendMonthly    = groupSpendByMonth(spendTxns)

  const freelancerStats = [
    { label: 'Jobs Completed', value: p.jobs_completed ?? 0,                                     icon: Briefcase,  color: 'text-[#14a800]', bg: 'bg-[#14a800]/10' },
    { label: 'Total Earned',   value: `₹${(p.total_earnings ?? 0).toLocaleString('en-IN')}`,     icon: DollarSign, color: 'text-blue-400',  bg: 'bg-blue-400/10'  },
    { label: 'Rating',         value: p.rating ? `${Number(p.rating).toFixed(1)} ★` : '—',       icon: Star,       color: 'text-amber-400', bg: 'bg-amber-400/10' },
    { label: 'Connects',       value: p.connects_balance ?? 0,                                    icon: Zap,        color: 'text-purple-400',bg: 'bg-purple-400/10'},
  ]

  const clientStatCards = [
    { label: 'Active Jobs',       value: clientStats.activeJobs,                                                icon: Briefcase,  color: 'text-[#14a800]', bg: 'bg-[#14a800]/10' },
    { label: 'Total Spent',       value: clientStats.totalSpent > 0 ? `₹${clientStats.totalSpent.toLocaleString('en-IN')}` : '₹0', icon: DollarSign, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Freelancers Hired', value: clientStats.freelancersHired,                                         icon: Users,      color: 'text-purple-400',bg: 'bg-purple-400/10'},
    { label: 'Pending Approvals', value: clientStats.pendingApprovals,                                         icon: Clock,      color: 'text-amber-400', bg: 'bg-amber-400/10' },
  ]

  const stats = isFreelancer ? freelancerStats : clientStatCards
  const activityContracts = isFreelancer ? freelancerContracts : recentContracts
  const activityNotifs = isFreelancer ? freelancerNotifications : recentNotifications

  const contractStatusColor: Record<string, string> = {
    active: 'text-[#14a800]', delivered: 'text-blue-400', complete: 'text-[#14a800]',
    disputed: 'text-red-400', cancelled: 'text-[var(--faint)]', pending: 'text-amber-400',
  }
  const notifTypeIcon: Record<string, string> = {
    payment: '💰', review: '⭐', message: '💬', proposal: '📄', dispute: '⚠️', system: '🔔',
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">

        {/* Welcome */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Welcome back, {displayName} 👋</h1>
          <p className="text-muted-foreground mt-1 text-sm capitalize">{profile.role} account</p>
        </div>

        {/* Verification nudge */}
        <VerificationNudge phoneVerified={p.phone_verified} eduVerified={p.edu_verified} role={profile.role ?? 'freelancer'} />

        {/* Pending approvals alert */}
        {!isFreelancer && clientStats.pendingApprovals > 0 && (
          <Link href="/contracts" className="flex items-center gap-3 mb-6 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/15 transition-colors">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-300">
                {clientStats.pendingApprovals} contract{clientStats.pendingApprovals > 1 ? 's' : ''} waiting for your approval
              </p>
              <p className="text-xs text-amber-500/70">Freelancer has submitted work — review and release payment.</p>
            </div>
            <ChevronRight className="w-4 h-4 text-amber-400" />
          </Link>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">{label}</span>
                <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
              </div>
              <div className="text-2xl font-bold text-foreground">{value}</div>
            </div>
          ))}
        </div>

        {/* ── FREELANCER DASHBOARD ─────────────────────────────── */}
        {isFreelancer && (
          <div className="space-y-6">

            {/* Row 1: Earnings chart + two metric cards */}
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <EarningsChart weekly={earningsWeekly} monthly={earningsMonthly} />
              </div>
              <div className="flex flex-col gap-4">

                {/* Proposal success rate */}
                <div className="card p-5 flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-4 h-4 text-[#14a800]" />
                    <span className="text-sm font-semibold text-foreground">Proposal Success</span>
                  </div>
                  <div className="text-3xl font-bold text-foreground mb-1">{successRate}%</div>
                  <p className="text-xs text-muted-foreground">
                    {proposalStats.hired} hired from {proposalStats.total} proposals
                  </p>
                  {proposalStats.total > 0 && (
                    <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-[#14a800] transition-all" style={{ width: `${successRate}%` }} />
                    </div>
                  )}
                </div>

                {/* Profile completeness */}
                <div className="card p-5 flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-semibold text-foreground">Profile Strength</span>
                  </div>
                  <div className="text-3xl font-bold text-foreground mb-1">{profileComplete}%</div>
                  <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${profileComplete}%`,
                        background: profileComplete >= 80 ? '#14a800' : profileComplete >= 50 ? '#f59e0b' : '#ef4444',
                      }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {profileComplete < 100
                      ? <Link href="/profile/edit" className="text-[#14a800] hover:underline">Complete your profile →</Link>
                      : 'Profile complete ✓'}
                  </p>
                </div>
              </div>
            </div>

            {/* Row 2: Quick actions + Activity + Job alerts */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Quick actions */}
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Quick actions</h2>
                <Link href="/jobs" className="flex items-center gap-3 card p-4 hover:border-[#14a800]/50 transition-colors group">
                  <div className="w-9 h-9 rounded-xl bg-[#14a800]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#14a800]/20">
                    <Briefcase className="w-4 h-4 text-[#14a800]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">Find Jobs</p>
                    <p className="text-xs text-[var(--faint)]">Browse open opportunities</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--faint)] group-hover:text-[#14a800]" />
                </Link>
                <Link href="/jobs/saved" className="flex items-center gap-3 card p-4 hover:border-[#14a800]/50 transition-colors group">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <Bookmark className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">Saved Jobs</p>
                    <p className="text-xs text-[var(--faint)]">Jobs you've bookmarked</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--faint)] group-hover:text-[#14a800]" />
                </Link>
                <Link href="/contracts" className="flex items-center gap-3 card p-4 hover:border-[#14a800]/50 transition-colors group">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">My Contracts</p>
                    <p className="text-xs text-[var(--faint)]">Track active work</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--faint)]" />
                </Link>
                <Link href="/connects" className="flex items-center gap-3 card p-4 hover:border-purple-500/40 transition-colors group">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-500/20">
                    <Zap className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">Buy Connects</p>
                    <p className="text-xs text-[var(--faint)]">Top up to submit proposals</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--faint)] group-hover:text-purple-400" />
                </Link>
                <Link href="/profile/edit" className="flex items-center gap-3 card p-4 hover:border-[#14a800]/50 transition-colors group">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                    <Star className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">Edit Profile</p>
                    <p className="text-xs text-[var(--faint)]">3× more responses when complete</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--faint)]" />
                </Link>
              </div>

              {/* Recent contracts */}
              <div className="lg:col-span-2 space-y-4">
                {activityContracts.length > 0 && (
                  <div className="card p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-sm font-semibold text-foreground">Recent Contracts</h2>
                      <Link href="/contracts" className="text-xs text-[#14a800] hover:underline">View all</Link>
                    </div>
                    <div className="space-y-3">
                      {activityContracts.map(c => {
                        const jobTitle = (c.job as { title: string } | null)?.title ?? 'Contract'
                        return (
                          <Link key={c.id} href={`/contracts/${c.id}`}
                            className="flex items-center justify-between gap-3 hover:bg-muted -mx-2 px-2 py-1.5 rounded-lg transition-colors">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{jobTitle}</p>
                              <p className="text-xs text-[var(--faint)]">{timeAgoServer(c.created_at)}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {c.amount && <span className="text-xs font-semibold text-[#14a800]">₹{c.amount.toLocaleString('en-IN')}</span>}
                              <span className={`text-[10px] font-bold capitalize ${contractStatusColor[c.status] ?? 'text-muted-foreground'}`}>{c.status}</span>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )}

                {activityNotifs.length > 0 && (
                  <div className="card p-5">
                    <h2 className="text-sm font-semibold text-foreground mb-4">Recent Notifications</h2>
                    <div className="space-y-3">
                      {activityNotifs.map(n => (
                        <div key={n.id} className="flex items-start gap-3">
                          <span className="text-base mt-0.5 flex-shrink-0">{notifTypeIcon[n.type] ?? '🔔'}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-foreground truncate">{n.title}</p>
                            <p className="text-xs text-[var(--faint)]">{timeAgoServer(n.created_at)}</p>
                          </div>
                          {n.link && <Link href={n.link} className="text-[10px] text-[#14a800] hover:underline flex-shrink-0">View</Link>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activityContracts.length === 0 && activityNotifs.length === 0 && (
                  <div className="card p-8 flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4">
                      <CheckCircle2 className="w-8 h-8 text-blue-400" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-2">Start winning projects</h3>
                    <p className="text-sm text-muted-foreground mb-5 max-w-xs">
                      Browse open jobs and submit your first proposal to get started.
                    </p>
                    <Link href="/jobs" className="btn btn-primary gap-2">
                      <Briefcase className="w-4 h-4" /> Browse Jobs
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Row 3: Quick Apply — Job Alerts */}
            {jobAlerts.length > 0 && (
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#14a800]" />
                    <h2 className="text-sm font-semibold text-foreground">Quick Apply — Jobs Matching Your Skills</h2>
                  </div>
                  <Link href="/jobs" className="text-xs text-[#14a800] hover:underline">Browse all</Link>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {jobAlerts.map(job => {
                    const budget = job.budget_type === 'fixed'
                      ? `₹${(job.budget_min ?? 0).toLocaleString('en-IN')} – ₹${(job.budget_max ?? 0).toLocaleString('en-IN')}`
                      : `₹${(job.budget_min ?? 0).toLocaleString('en-IN')}/hr`
                    return (
                      <Link key={job.id} href={`/jobs/${job.id}/apply`}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3 hover:border-[#14a800]/50 hover:bg-[#14a800]/5 transition-colors group">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{job.title}</p>
                          <p className="text-xs text-[#14a800] font-semibold">{budget}</p>
                        </div>
                        <span className="text-xs font-semibold text-[#14a800] bg-[#14a800]/10 px-2.5 py-1 rounded-full whitespace-nowrap group-hover:bg-[#14a800]/20 transition-colors">
                          Apply →
                        </span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── CLIENT DASHBOARD ─────────────────────────────────── */}
        {!isFreelancer && (
          <div className="space-y-6">

            {/* Row 1: Spending chart + metrics */}
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <SpendingChart data={spendMonthly} />
              </div>
              <div className="flex flex-col gap-4">

                {/* Avg time to hire */}
                <div className="card p-5 flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-semibold text-foreground">Avg. Time to Hire</span>
                  </div>
                  <div className="text-3xl font-bold text-foreground mb-1">
                    {clientStats.avgHireDays > 0 ? `${clientStats.avgHireDays}d` : '—'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {clientStats.avgHireDays > 0 ? 'from job post to contract' : 'No contracts yet'}
                  </p>
                </div>

                {/* Active vs Completed breakdown */}
                <div className="card p-5 flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart2 className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-semibold text-foreground">Jobs Breakdown</span>
                  </div>
                  <div className="space-y-2.5">
                    {[
                      { label: 'Active', value: clientStats.activeJobs, color: '#14a800' },
                      { label: 'Completed', value: clientStats.completedJobs, color: '#60a5fa' },
                    ].map(({ label, value, color }) => {
                      const total = clientStats.activeJobs + clientStats.completedJobs
                      const pct = total > 0 ? Math.round((value / total) * 100) : 0
                      return (
                        <div key={label}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">{label}</span>
                            <span className="font-semibold text-foreground">{value}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2: Quick actions + Contracts */}
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Quick actions</h2>
                <Link href="/jobs/post" className="flex items-center gap-3 card p-4 hover:border-[#14a800]/50 transition-colors group">
                  <div className="w-9 h-9 rounded-xl bg-[#14a800]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#14a800]/20">
                    <Plus className="w-4 h-4 text-[#14a800]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">Post a Job</p>
                    <p className="text-xs text-[var(--faint)]">Get proposals within hours</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--faint)] group-hover:text-[#14a800]" />
                </Link>
                <Link href="/my-jobs" className="flex items-center gap-3 card p-4 hover:border-[#14a800]/50 transition-colors group">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <Briefcase className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">My Jobs</p>
                    <p className="text-xs text-[var(--faint)]">Review proposals & manage</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--faint)]" />
                </Link>
                <Link href="/contracts" className="flex items-center gap-3 card p-4 hover:border-[#14a800]/50 transition-colors group">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">Active Contracts</p>
                    <p className="text-xs text-[var(--faint)]">Monitor progress & payments</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--faint)]" />
                </Link>
              </div>

              <div className="lg:col-span-2 space-y-4">
                {recentJobs.length > 0 && (
                  <div className="card p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-sm font-semibold text-foreground">Recent Jobs</h2>
                      <Link href="/my-jobs" className="text-xs text-[#14a800] hover:underline">View all</Link>
                    </div>
                    <div className="space-y-3">
                      {recentJobs.map(job => (
                        <Link key={job.id} href={`/jobs/${job.id}/proposals`}
                          className="flex items-center justify-between gap-3 hover:bg-muted -mx-2 px-2 py-1.5 rounded-lg transition-colors">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{job.title}</p>
                            <p className="text-xs text-[var(--faint)]">{timeAgoServer(job.created_at)}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs text-muted-foreground">
                              {job.proposals_count ?? 0} proposal{(job.proposals_count ?? 0) !== 1 ? 's' : ''}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              job.status === 'open' ? 'bg-[#14a800]/20 text-[#14a800]' : 'bg-muted text-muted-foreground'
                            }`}>{job.status}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {recentContracts.length > 0 && (
                  <div className="card p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-sm font-semibold text-foreground">Recent Contracts</h2>
                      <Link href="/contracts" className="text-xs text-[#14a800] hover:underline">View all</Link>
                    </div>
                    <div className="space-y-3">
                      {recentContracts.map(c => {
                        const jobTitle = (c.job as { title: string } | null)?.title ?? 'Contract'
                        const freelancerName = (c.freelancer as { full_name: string | null } | null)?.full_name ?? null
                        return (
                          <Link key={c.id} href={`/contracts/${c.id}`}
                            className="flex items-center justify-between gap-3 hover:bg-muted -mx-2 px-2 py-1.5 rounded-lg transition-colors">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{jobTitle}</p>
                              <p className="text-xs text-[var(--faint)]">
                                {freelancerName ? `with ${freelancerName} · ` : ''}{timeAgoServer(c.created_at)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {c.amount && <span className="text-xs font-semibold text-[#14a800]">₹{c.amount.toLocaleString('en-IN')}</span>}
                              <span className={`text-[10px] font-bold capitalize ${contractStatusColor[c.status] ?? 'text-muted-foreground'}`}>{c.status}</span>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )}

                {recentJobs.length === 0 && recentContracts.length === 0 && (
                  <div className="card p-8 flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-2xl bg-[#14a800]/10 flex items-center justify-center mb-4">
                      <Briefcase className="w-8 h-8 text-[#14a800]" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-2">Post your first job</h3>
                    <p className="text-sm text-muted-foreground mb-5 max-w-xs">
                      Thousands of skilled freelancers are ready to work. Post a job and get proposals within hours.
                    </p>
                    <Link href="/jobs/post" className="btn btn-primary gap-2">
                      <Plus className="w-4 h-4" /> Post a Job
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Row 3: Saved freelancers */}
            {savedFreelancers.length > 0 && (
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Bookmark className="w-4 h-4 text-[#14a800]" />
                    <h2 className="text-sm font-semibold text-foreground">Saved Freelancers</h2>
                  </div>
                  <Link href="/freelancers" className="text-xs text-[#14a800] hover:underline">Browse all →</Link>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {savedFreelancers.map(f => (
                    <Link key={f.id} href={`/profile/${f.id}`}
                      className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3 hover:border-[#14a800]/50 hover:bg-[#14a800]/5 transition-colors">
                      {f.avatar_url ? (
                        <img src={f.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-[#14a800]/20 flex items-center justify-center text-xs font-bold text-[#14a800] flex-shrink-0">
                          {(f.full_name ?? 'F')[0].toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{f.full_name ?? 'Freelancer'}</p>
                        {f.title && <p className="text-xs text-muted-foreground truncate">{f.title}</p>}
                        {f.rating > 0 && <p className="text-xs text-amber-400">★ {Number(f.rating).toFixed(1)}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Notifications */}
            {activityNotifs.length > 0 && (
              <div className="card p-5">
                <h2 className="text-sm font-semibold text-foreground mb-4">Recent Notifications</h2>
                <div className="space-y-3">
                  {activityNotifs.map(n => (
                    <div key={n.id} className="flex items-start gap-3">
                      <span className="text-base mt-0.5 flex-shrink-0">{notifTypeIcon[n.type] ?? '🔔'}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground truncate">{n.title}</p>
                        <p className="text-xs text-[var(--faint)]">{timeAgoServer(n.created_at)}</p>
                      </div>
                      {n.link && <Link href={n.link} className="text-[10px] text-[#14a800] hover:underline flex-shrink-0">View</Link>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  )
}

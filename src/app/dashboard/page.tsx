import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import VerificationNudge from '@/components/verification/VerificationNudge'
import Link from 'next/link'
import { Briefcase, DollarSign, Star, FileText, Users, Clock, Plus, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react'
import type { Profile } from '@/types/database'

function timeAgoServer(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
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
  }
  const displayName = p.full_name?.split(' ')[0] ?? p.company_name ?? 'there'

  // ── Client-specific data ──────────────────────────────────────
  let clientStats = { activeJobs: 0, totalSpent: 0, freelancersHired: 0, pendingApprovals: 0 }
  let recentJobs: { id: string; title: string; status: string; created_at: string; proposals_count: number }[] = []
  let recentContracts: { id: string; status: string; created_at: string; amount: number | null; job: { title: string } | null; freelancer: { full_name: string | null } | null }[] = []
  let recentNotifications: { id: string; title: string; created_at: string; type: string; link: string | null }[] = []

  if (!isFreelancer) {
    const [
      { count: activeJobs },
      { count: pendingApprovals },
      { data: contractsRaw },
      { data: jobsRaw },
      { data: notifs },
    ] = await Promise.all([
      supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('client_id', user.id).eq('status', 'open'),
      supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('client_id', user.id).eq('status', 'delivered'),
      supabase.from('contracts')
        .select('id, status, created_at, amount, freelancer_id, job:jobs(title), freelancer:profiles!contracts_freelancer_id_fkey(full_name)')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase.from('jobs').select('id, title, status, created_at, proposals_count').eq('client_id', user.id).order('created_at', { ascending: false }).limit(4),
      supabase.from('notifications').select('id, title, created_at, type, link').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
    ])

    // Count unique freelancers by ID (not name, to avoid false dedup)
    const allContracts = (contractsRaw ?? []) as unknown as { freelancer_id: string | null; freelancer: { full_name: string | null } | null; amount: number | null }[]
    const uniqueFreelancers = new Set(allContracts.map(c => c.freelancer_id).filter(Boolean)).size

    // Sum total spent from contracts
    const { data: spentRaw } = await supabase.from('transactions').select('amount').eq('payer_id', user.id).eq('type', 'escrow_release')
    const totalSpent = (spentRaw ?? []).reduce((sum, t) => sum + ((t as { amount: number }).amount ?? 0), 0)

    clientStats = {
      activeJobs: activeJobs ?? 0,
      totalSpent,
      freelancersHired: uniqueFreelancers,
      pendingApprovals: pendingApprovals ?? 0,
    }
    recentJobs = (jobsRaw ?? []) as unknown as typeof recentJobs
    recentContracts = (contractsRaw ?? []) as unknown as typeof recentContracts
    recentNotifications = (notifs ?? []) as unknown as typeof recentNotifications
  }

  // ── Freelancer data ───────────────────────────────────────────
  let freelancerContracts: typeof recentContracts = []
  let freelancerNotifications: typeof recentNotifications = []
  if (isFreelancer) {
    const [{ data: fContracts }, { data: fNotifs }] = await Promise.all([
      supabase.from('contracts')
        .select('id, status, created_at, amount, job:jobs(title), freelancer:profiles!contracts_freelancer_id_fkey(full_name)')
        .eq('freelancer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase.from('notifications').select('id, title, created_at, type, link').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
    ])
    freelancerContracts = (fContracts ?? []) as unknown as typeof recentContracts
    freelancerNotifications = (fNotifs ?? []) as unknown as typeof recentNotifications
  }

  const freelancerStats = [
    { label: 'Jobs Completed', value: p.jobs_completed ?? 0,                                      icon: Briefcase, color: 'text-[#14a800]', bg: 'bg-[#14a800]/10' },
    { label: 'Total Earned',   value: `₹${(p.total_earnings ?? 0).toLocaleString()}`,              icon: DollarSign, color: 'text-blue-400',  bg: 'bg-blue-400/10'  },
    { label: 'Rating',         value: p.rating ? `${Number(p.rating).toFixed(1)} ★` : '—',        icon: Star,       color: 'text-amber-400', bg: 'bg-amber-400/10' },
    { label: 'Connects',       value: p.connects_balance ?? 0,                                     icon: FileText,   color: 'text-purple-400',bg: 'bg-purple-400/10'},
  ]

  const clientStatCards = [
    { label: 'Active Jobs',        value: clientStats.activeJobs,                                        icon: Briefcase,  color: 'text-[#14a800]', bg: 'bg-[#14a800]/10' },
    { label: 'Total Spent',        value: clientStats.totalSpent > 0 ? `₹${clientStats.totalSpent.toLocaleString()}` : '₹0', icon: DollarSign, color: 'text-blue-400',  bg: 'bg-blue-400/10'  },
    { label: 'Freelancers Hired',  value: clientStats.freelancersHired,                                  icon: Users,      color: 'text-purple-400',bg: 'bg-purple-400/10'},
    { label: 'Pending Approvals',  value: clientStats.pendingApprovals,                                  icon: Clock,      color: 'text-amber-400', bg: 'bg-amber-400/10' },
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
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {displayName} 👋
          </h1>
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

        {/* Stats */}
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

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Quick links */}
          <div className="lg:col-span-1 space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick actions</h2>
            {isFreelancer ? (
              <>
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
                <Link href="/profile" className="flex items-center gap-3 card p-4 hover:border-[#14a800]/50 transition-colors group">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                    <Star className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">Public Profile</p>
                    <p className="text-xs text-[var(--faint)]">3× more responses with a complete profile</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--faint)]" />
                </Link>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>

          {/* Recent activity */}
          <div className="lg:col-span-2 space-y-4">
            {/* Recent jobs (client only) */}
            {!isFreelancer && recentJobs.length > 0 && (
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

            {/* No jobs CTA — client only */}
            {!isFreelancer && recentJobs.length === 0 && (
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

            {/* Recent contracts */}
            {activityContracts.length > 0 && (
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-foreground">Recent Contracts</h2>
                  <Link href="/contracts" className="text-xs text-[#14a800] hover:underline">View all</Link>
                </div>
                <div className="space-y-3">
                  {activityContracts.map(c => {
                    const jobTitle = (c.job as { title: string } | null)?.title ?? 'Contract'
                    const freelancerName = (c.freelancer as { full_name: string | null } | null)?.full_name ?? null
                    return (
                      <Link key={c.id} href={`/contracts/${c.id}`}
                        className="flex items-center justify-between gap-3 hover:bg-muted -mx-2 px-2 py-1.5 rounded-lg transition-colors">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{jobTitle}</p>
                          <p className="text-xs text-[var(--faint)]">
                            {freelancerName && !isFreelancer ? `with ${freelancerName} · ` : ''}{timeAgoServer(c.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {c.amount && <span className="text-xs font-semibold text-[#14a800]">₹{(c.amount).toLocaleString()}</span>}
                          <span className={`text-[10px] font-bold capitalize ${contractStatusColor[c.status] ?? 'text-muted-foreground'}`}>
                            {c.status}
                          </span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Recent notifications */}
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
                      {n.link && (
                        <Link href={n.link} className="text-[10px] text-[#14a800] hover:underline flex-shrink-0">View</Link>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state for freelancer with no contracts */}
            {isFreelancer && activityContracts.length === 0 && activityNotifs.length === 0 && (
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
      </main>
    </div>
  )
}

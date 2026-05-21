import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { formatCurrency, timeAgo } from '@/lib/utils'
import { Briefcase, Clock, MapPin, Star, Users, ChevronRight, Shield } from 'lucide-react'

const LEVEL_LABEL: Record<string, string> = { entry: 'Entry Level', intermediate: 'Intermediate', expert: 'Expert' }

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: job } = await supabase
    .from('jobs')
    .select(`*, profiles:client_id(id, full_name, avatar_url, company_name, rating, review_count, jobs_posted, created_at, location, phone_verified)`)
    .eq('id', id)
    .single()

  if (!job) notFound()

  const client = job.profiles as Record<string, unknown> | null
  const skills = (job.skills ?? job.skills_required ?? []) as string[]
  const isOwner = user?.id === job.client_id
  const budgetLabel = job.budget_type === 'fixed'
    ? `${formatCurrency(job.budget_min ?? 0)} – ${formatCurrency(job.budget_max ?? 0)}`
    : `${formatCurrency(job.budget_min ?? 0)}/hr`

  // Check if user already applied
  let alreadyApplied = false
  if (user) {
    const { data: existing } = await supabase.from('proposals').select('id').eq('job_id', id).eq('freelancer_id', user.id).single()
    alreadyApplied = !!existing
  }

  // Get freelancer profile for skill match
  let freelancerSkills: string[] = []
  let connectsBalance = 0
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role, skills, connects_balance').eq('id', user.id).single()
    if (profile?.role === 'freelancer') {
      freelancerSkills = profile.skills ?? []
      connectsBalance = profile.connects_balance ?? 0
    }
  }

  const matchedSkills = skills.filter(s => freelancerSkills.map(x => x.toLowerCase()).includes(s.toLowerCase()))
  const matchPct = skills.length > 0 ? Math.round((matchedSkills.length / skills.length) * 100) : 0

  return (
    <div className="flex flex-col min-h-screen bg-card">
      <Header />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-4 flex items-center gap-1">
          <Link href="/jobs" className="hover:text-[#14a800]">Jobs</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground truncate max-w-xs">{job.title}</span>
        </nav>

        <div className="flex gap-6 items-start flex-col lg:flex-row">
          {/* Main */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Header card */}
            <div className="card p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {job.category && <span className="badge badge-gray">{job.category}</span>}
                    <span className="badge badge-orange">{LEVEL_LABEL[job.level ?? job.experience_level] ?? job.experience_level}</span>
                    {job.status !== 'open' && <span className="badge badge-red capitalize">{job.status.replace('_', ' ')}</span>}
                    {matchPct > 0 && (
                      <span className={`badge ${matchPct >= 70 ? 'badge-green' : 'badge-orange'}`}>{matchPct}% skill match</span>
                    )}
                  </div>
                  <h1 className="text-2xl font-bold text-foreground mb-1">{job.title}</h1>
                  <p className="text-sm text-muted-foreground">Posted {timeAgo(job.created_at)}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-[#14a800]">{budgetLabel}</div>
                  <div className="text-xs text-muted-foreground capitalize">{job.budget_type} price</div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4 py-4 border-y border-border">
                {[
                  { icon: Clock, label: 'Duration', value: job.duration },
                  { icon: Users, label: 'Proposals', value: `${job.proposals_count ?? job.bid_count ?? 0}` },
                  { icon: Briefcase, label: 'Type', value: job.job_type === 'fixed' ? 'Fixed Price' : 'Hourly' },
                ].map(({ icon: Icon, label, value }) => value && (
                  <div key={label} className="flex items-center gap-2 text-sm">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <div><div className="text-muted-foreground text-xs">{label}</div><div className="font-medium text-foreground">{value}</div></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="card p-6">
              <h2 className="font-semibold text-foreground mb-3">About this job</h2>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{job.description}</p>
            </div>

            {/* Skills */}
            {skills.length > 0 && (
              <div className="card p-6">
                <h2 className="font-semibold text-foreground mb-3">Required skills</h2>
                <div className="flex flex-wrap gap-2">
                  {skills.map(s => (
                    <span key={s} className={`badge text-sm px-3 py-1.5 ${matchedSkills.includes(s) ? 'badge-green' : 'badge-gray'}`}>
                      {s}
                      {matchedSkills.includes(s) && <span className="ml-0.5">✓</span>}
                    </span>
                  ))}
                </div>
                {matchPct > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">You match {matchedSkills.length} of {skills.length} required skills.</p>
                )}
              </div>
            )}

            {/* Client-only: view proposals */}
            {isOwner && (
              <div className="card p-5 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-foreground">Manage proposals</div>
                  <div className="text-sm text-muted-foreground">{job.proposals_count ?? 0} proposals received</div>
                </div>
                <Link href={`/jobs/${id}/proposals`} className="btn btn-primary">View Proposals →</Link>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-72 flex-shrink-0 space-y-4">
            {/* Apply card */}
            {job.status === 'open' && !isOwner && (
              <div className="card p-5">
                {alreadyApplied ? (
                  <div className="text-center">
                    <div className="w-10 h-10 rounded-full bg-[#14a800/20] flex items-center justify-center mx-auto mb-2">
                      <Shield className="w-5 h-5 text-[#14a800]" />
                    </div>
                    <p className="font-semibold text-foreground mb-1">Proposal submitted</p>
                    <p className="text-xs text-muted-foreground">You&apos;ve already applied to this job.</p>
                  </div>
                ) : !user ? (
                  <>
                    <p className="text-sm text-muted-foreground mb-3 text-center">Sign in to submit a proposal</p>
                    <Link href={`/auth/login?next=/jobs/${id}`} className="btn btn-primary w-full">Sign in to Apply</Link>
                  </>
                ) : (
                  <>
                    <div className="text-center mb-4">
                      <div className="text-2xl font-bold text-[#14a800]">{budgetLabel}</div>
                    </div>
                    {connectsBalance > 0 && (
                      <p className="text-xs text-muted-foreground mb-3 text-center">
                        You have <strong>{connectsBalance}</strong> connects
                      </p>
                    )}
                    <Link href={`/jobs/${id}/apply`} className="btn btn-primary w-full btn-lg">
                      Submit a Proposal
                    </Link>
                  </>
                )}
              </div>
            )}

            {/* Client card */}
            {client && (
              <div className="card p-5">
                <h3 className="font-semibold text-foreground mb-3 text-sm">About the client</h3>
                <div className="flex items-center gap-3 mb-3">
                  {client.avatar_url ? (
                    <img src={client.avatar_url as string} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-card flex items-center justify-center text-sm font-bold text-muted-foreground">
                      {String(client.company_name ?? client.full_name ?? 'C')[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-foreground text-sm">{String(client.company_name ?? client.full_name ?? '')}</div>
                    {client.location != null && <div className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="w-3 h-3" />{String(client.location)}</div>}
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  {(client.rating as number) > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Rating</span>
                      <span className="flex items-center gap-1 text-amber-500 font-medium"><Star className="w-3.5 h-3.5 fill-current" />{(client.rating as number).toFixed(1)}</span>
                    </div>
                  )}
                  {(client.jobs_posted as number) > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Jobs posted</span>
                      <span className="font-medium text-foreground">{String(client.jobs_posted)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Member since</span>
                    <span className="font-medium text-foreground">{new Date(client.created_at as string).getFullYear()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

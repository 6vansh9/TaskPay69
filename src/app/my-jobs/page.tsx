import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import { Briefcase, Users, Clock, CheckCircle2, XCircle, ArrowRight, PlusCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const STATUS_STYLE: Record<string, string> = {
  open:        'bg-[#14a800/15] text-[#4ade80]',
  in_progress: 'bg-blue-950/50 text-blue-400',
  complete:    'bg-card text-muted-foreground',
  closed:      'bg-card text-muted-foreground',
}
const STATUS_ICON: Record<string, typeof Clock> = {
  open:        Clock,
  in_progress: Briefcase,
  complete:    CheckCircle2,
  closed:      XCircle,
}

export default async function MyJobsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if ((profile as { role: string } | null)?.role !== 'client') redirect('/dashboard')

  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, title, category, status, bid_count, budget_min, budget_max, created_at')
    .eq('client_id', user.id)
    .order('created_at', { ascending: false })

  const jobList = (jobs ?? []) as {
    id: string; title: string; category: string; status: string
    bid_count: number; budget_min: number; budget_max: number; created_at: string
  }[]

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">My Jobs</h1>
          <Link href="/jobs/post" className="btn btn-primary btn-sm">
            <PlusCircle className="w-4 h-4" /> Post a Job
          </Link>
        </div>

        {jobList.length === 0 ? (
          <div className="card p-12 text-center">
            <Briefcase className="w-10 h-10 text-[var(--faint)] mx-auto mb-3" />
            <h3 className="font-semibold text-foreground mb-1">No jobs posted yet</h3>
            <p className="text-sm text-muted-foreground mb-5">Post your first job and start receiving proposals within hours.</p>
            <Link href="/jobs/post" className="btn btn-primary">Post a Job</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {jobList.map(job => {
              const Icon = STATUS_ICON[job.status] ?? Clock
              return (
                <div key={job.id} className="card p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h2 className="font-semibold text-foreground truncate">{job.title}</h2>
                        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1', STATUS_STYLE[job.status] ?? 'bg-card text-muted-foreground')}>
                          <Icon className="w-3 h-3" />
                          {job.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <span>{job.category}</span>
                        <span>₹{job.budget_min.toLocaleString()} – ₹{job.budget_max.toLocaleString()}</span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {job.bid_count} proposal{job.bid_count !== 1 ? 's' : ''}
                        </span>
                        <span>{new Date(job.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {job.status === 'open' && job.bid_count > 0 && (
                        <Link href={`/jobs/${job.id}/proposals`} className="btn btn-primary btn-sm">
                          <Users className="w-3.5 h-3.5" /> Proposals
                        </Link>
                      )}
                      <Link href={`/jobs/${job.id}`} className="btn btn-secondary btn-sm">
                        View <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import JobCard from '@/components/jobs/JobCard'
import Link from 'next/link'
import { Bookmark } from 'lucide-react'
import type { JobWithProfile } from '@/lib/hooks'

export const metadata: Metadata = { title: 'Saved Jobs | TaskPay' }

export default async function SavedJobsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/jobs/saved')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'freelancer') redirect('/dashboard')

  const { data: savedRows } = await supabase
    .from('saved_jobs')
    .select('job_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const savedJobIds = (savedRows ?? []).map(r => r.job_id as string)

  let jobs: JobWithProfile[] = []
  if (savedJobIds.length > 0) {
    const { data: jobsRaw } = await supabase
      .from('jobs')
      .select('*, profiles:client_id(full_name, avatar_url, company_name, rating, review_count)')
      .in('id', savedJobIds)
    const jobMap = new Map((jobsRaw ?? []).map(j => [j.id, j]))
    jobs = savedJobIds.map(id => jobMap.get(id)).filter(Boolean) as unknown as JobWithProfile[]
  }

  return (
    <div className="flex flex-col min-h-screen bg-card">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Saved Jobs</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {jobs.length} job{jobs.length !== 1 ? 's' : ''} saved
            </p>
          </div>
          <Link href="/jobs" className="text-sm text-[#14a800] hover:underline">
            Browse all jobs →
          </Link>
        </div>

        {jobs.length === 0 ? (
          <div className="card p-12 text-center">
            <Bookmark className="w-10 h-10 text-[var(--faint)] mx-auto mb-3" />
            <h3 className="font-semibold text-foreground mb-1">No saved jobs yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Bookmark jobs you&apos;re interested in to find them here.
            </p>
            <Link href="/jobs" className="btn btn-primary">Browse Jobs</Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {jobs.map(job => (
              <JobCard key={job.id} job={job} saved={true} />
            ))}
          </div>
        )}

      </main>
      <Footer />
    </div>
  )
}

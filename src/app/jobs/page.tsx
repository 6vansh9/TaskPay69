'use client'

import { Suspense, useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Search, SlidersHorizontal, X, Briefcase, Clock, History, Sparkles } from 'lucide-react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import JobCard from '@/components/jobs/JobCard'
import JobFilters from '@/components/jobs/JobFilters'
import { useJobs, type JobFilters as IJobFilters, type JobWithProfile } from '@/lib/hooks'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { formatCurrency, timeAgo, cn } from '@/lib/utils'

// ── Recently Viewed ────────────────────────────────────────────────────
const RV_KEY = 'tp_recently_viewed_jobs'
const RV_MAX = 6

interface RecentJob {
  id: string
  title: string
  budget_type: string
  budget_min: number | null
  budget_max: number | null
  category: string | null
  viewed_at: string
}

function saveRecentJob(job: JobWithProfile) {
  try {
    const prev: RecentJob[] = JSON.parse(localStorage.getItem(RV_KEY) ?? '[]')
    const next = [
      {
        id: job.id, title: job.title, budget_type: job.budget_type,
        budget_min: job.budget_min, budget_max: job.budget_max,
        category: job.category ?? null, viewed_at: new Date().toISOString(),
      },
      ...prev.filter(j => j.id !== job.id),
    ].slice(0, RV_MAX)
    localStorage.setItem(RV_KEY, JSON.stringify(next))
  } catch { /* ignore */ }
}

function getRecentJobs(): RecentJob[] {
  try { return JSON.parse(localStorage.getItem(RV_KEY) ?? '[]') } catch { return [] }
}

// ── Autocomplete hook ──────────────────────────────────────────────────
function useAutocomplete(query: string) {
  const [suggestions, setSuggestions] = useState<{ titles: string[]; skills: string[] }>({ titles: [], skills: [] })
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (query.length < 2) { setSuggestions({ titles: [], skills: [] }); return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/jobs/suggest?q=${encodeURIComponent(query)}`)
        if (res.ok) setSuggestions(await res.json())
      } catch { /* ignore */ }
    }, 220)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  return suggestions
}

// ── Skeleton card ──────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="flex gap-2"><div className="skeleton h-5 w-20 rounded-full" /><div className="skeleton h-5 w-16 rounded-full" /></div>
      <div className="skeleton h-5 w-3/4" />
      <div className="skeleton h-4 w-full" />
      <div className="skeleton h-4 w-5/6" />
      <div className="flex gap-1.5"><div className="skeleton h-5 w-14 rounded-full" /><div className="skeleton h-5 w-16 rounded-full" /></div>
      <div className="flex justify-between pt-2 border-t border-border"><div className="skeleton h-4 w-24" /><div className="skeleton h-4 w-20" /></div>
    </div>
  )
}

// ── Small recent-job card ──────────────────────────────────────────────
function RecentJobPill({ job }: { job: RecentJob }) {
  const budgetLabel = job.budget_type === 'fixed'
    ? `${formatCurrency(job.budget_min ?? 0)}–${formatCurrency(job.budget_max ?? 0)}`
    : `${formatCurrency(job.budget_min ?? 0)}/hr`
  return (
    <Link href={`/jobs/${job.id}`}
      className="flex-shrink-0 w-56 card p-3.5 hover:border-[#14a800]/50 transition-colors group">
      {job.category && (
        <span className="badge badge-gray text-[10px] mb-1.5">{job.category}</span>
      )}
      <p className="text-sm font-medium text-foreground group-hover:text-[#14a800] transition-colors line-clamp-2 leading-tight">
        {job.title}
      </p>
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs font-semibold text-[#14a800]">{budgetLabel}</span>
        <span className="text-[10px] text-[var(--faint)]">{timeAgo(job.viewed_at)}</span>
      </div>
    </Link>
  )
}

// ── Main content ───────────────────────────────────────────────────────
function JobsContent() {
  const sp = useSearchParams()
  const router = useRouter()
  const [searchInput, setSearchInput] = useState(sp.get('q') ?? '')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [freelancerSkills, setFreelancerSkills] = useState<string[]>([])
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set())
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const suggestions = useAutocomplete(searchInput)

  const filters: IJobFilters = {
    q:                sp.get('q') ?? '',
    category:         sp.get('category') ?? '',
    budget_type:      sp.get('budget_type') ?? '',
    experience_level: sp.get('experience_level') ?? '',
    duration:         sp.get('duration') ?? '',
    page:             parseInt(sp.get('page') ?? '1'),
  }

  const { data, isLoading, isFetching } = useJobs(filters)

  useEffect(() => {
    setRecentJobs(getRecentJobs())
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('skills, role').eq('id', user.id).single()
        .then(({ data: profile }) => {
          if (profile?.role) setUserRole(profile.role)
          if (profile?.role === 'freelancer' && profile.skills) setFreelancerSkills(profile.skills)
        })
    })
    fetch('/api/bookmarks/jobs')
      .then(r => r.ok ? r.json() : { ids: [] })
      .then(({ ids }) => setSavedJobIds(new Set(ids ?? [])))
      .catch(() => {})
  }, [])

  // Close suggestions on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSearch = useCallback((q: string) => {
    const params = new URLSearchParams(sp.toString())
    if (q.trim()) params.set('q', q.trim()); else params.delete('q')
    params.delete('page')
    setSearchInput(q)
    setShowSuggestions(false)
    router.push(`/jobs?${params.toString()}`)
  }, [sp, router])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSearch(searchInput)
  }

  const hasSuggestions = suggestions.titles.length > 0 || suggestions.skills.length > 0

  // Compute recommended jobs: those with >0 skill match, sorted by match %
  const recommendedJobs = freelancerSkills.length > 0 && data?.jobs
    ? [...data.jobs]
        .map(job => {
          const jobSkills = (job.skills ?? job.skills_required ?? []).map((s: string) => s.toLowerCase())
          const matched = freelancerSkills.filter(s => jobSkills.includes(s.toLowerCase())).length
          return { job, matched, pct: jobSkills.length > 0 ? Math.round((matched / jobSkills.length) * 100) : 0 }
        })
        .filter(x => x.matched > 0)
        .sort((a, b) => b.pct - a.pct)
        .slice(0, 3)
    : []

  const activeFiltersCount = ['category', 'budget_type', 'experience_level', 'duration'].filter(k => sp.has(k)).length
  const hasActiveQuery = !!(filters.q || filters.category || filters.budget_type || filters.experience_level || filters.duration)

  return (
    <div className="flex flex-col min-h-screen bg-card">
      <Header />

      {/* Top search bar */}
      <div className="bg-card border-b border-border sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1" ref={searchRef}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--faint)]" />
              <input
                type="text"
                value={searchInput}
                onChange={e => { setSearchInput(e.target.value); setShowSuggestions(true) }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Search jobs by title, skill, or keyword…"
                className="input pl-9 pr-4"
                autoComplete="off"
              />
              {searchInput && (
                <button type="button"
                  onClick={() => { setSearchInput(''); const p = new URLSearchParams(sp.toString()); p.delete('q'); router.push(`/jobs?${p}`) }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--faint)] hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              )}

              {/* Autocomplete dropdown */}
              {showSuggestions && hasSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-muted border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
                  {suggestions.titles.length > 0 && (
                    <div>
                      <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold text-[var(--faint)] uppercase tracking-wider">
                        Jobs
                      </p>
                      {suggestions.titles.map(t => (
                        <button key={t} type="button"
                          onClick={() => handleSearch(t)}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-foreground hover:bg-white/5 text-left">
                          <Briefcase className="w-3.5 h-3.5 text-[var(--faint)] flex-shrink-0" />
                          <span className="truncate">{t}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {suggestions.skills.length > 0 && (
                    <div className={suggestions.titles.length > 0 ? 'border-t border-border' : ''}>
                      <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold text-[var(--faint)] uppercase tracking-wider">
                        Skills
                      </p>
                      {suggestions.skills.map(s => (
                        <button key={s} type="button"
                          onClick={() => handleSearch(s)}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-foreground hover:bg-white/5 text-left">
                          <Search className="w-3.5 h-3.5 text-[var(--faint)] flex-shrink-0" />
                          <span className="truncate">{s}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <button type="submit" className="btn btn-primary">Search</button>
            <button type="button" onClick={() => setFiltersOpen(v => !v)}
              className={`btn btn-secondary lg:hidden relative ${filtersOpen ? 'border-[#14a800] text-[#14a800]' : ''}`}>
              <SlidersHorizontal className="w-4 h-4" />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#14a800] text-foreground text-[10px] flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </form>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Recently Viewed — only shown when no active search */}
        {!hasActiveQuery && recentJobs.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-muted-foreground">Recently Viewed</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
              {recentJobs.map(j => <RecentJobPill key={j.id} job={j} />)}
            </div>
          </section>
        )}

        <div className="flex gap-6">
          {/* Sidebar filters — desktop */}
          <aside className="hidden lg:block w-56 flex-shrink-0 sticky top-36 self-start">
            <Suspense><JobFilters /></Suspense>
          </aside>

          {/* Mobile filter drawer */}
          {filtersOpen && (
            <div className="lg:hidden fixed inset-0 z-50 flex">
              <div className="absolute inset-0 bg-black/40" onClick={() => setFiltersOpen(false)} />
              <div className="relative bg-card w-72 h-full overflow-y-auto p-5 shadow-xl ml-auto">
                <Suspense><JobFilters onClose={() => setFiltersOpen(false)} /></Suspense>
              </div>
            </div>
          )}

          {/* Jobs list */}
          <div className="flex-1 min-w-0">
            {/* Recommended section — only for freelancers with skills */}
            {!hasActiveQuery && recommendedJobs.length > 0 && (
              <section className="mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-[#14a800]" />
                  <h2 className="text-sm font-semibold text-foreground">Recommended for you</h2>
                  <span className="text-xs text-[var(--faint)]">based on your skills</span>
                </div>
                <div className="flex flex-col gap-3">
                  {recommendedJobs.map(({ job }) => (
                    <div key={job.id} onClick={() => saveRecentJob(job)}>
                      <JobCard job={job} freelancerSkills={freelancerSkills} saved={savedJobIds.has(job.id)} isFreelancer={userRole === 'freelancer'} />
                    </div>
                  ))}
                </div>
                <div className="mt-3 border-t border-border pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm text-muted-foreground">
                      {isLoading ? 'Loading…' : (
                        <>
                          {isFetching && <span className="mr-2 text-[#14a800]">↻</span>}
                          All <span className="font-semibold text-foreground">{data?.total ?? 0}</span> open jobs
                        </>
                      )}
                    </div>
                    {userRole === 'client' && (
                      <Link href="/jobs/post" className="btn btn-primary btn-sm hidden sm:inline-flex">
                        <Briefcase className="w-3.5 h-3.5" /> Post a Job
                      </Link>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Results header when no recommended section */}
            {(hasActiveQuery || recommendedJobs.length === 0) && (
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-muted-foreground">
                  {isLoading ? 'Loading…' : (
                    <>
                      {isFetching && <span className="mr-2 text-[#14a800]">↻</span>}
                      <span className="font-semibold text-foreground">{data?.total ?? 0}</span> jobs found
                      {sp.get('q') && <span> for &quot;<em>{sp.get('q')}</em>&quot;</span>}
                    </>
                  )}
                </div>
                {userRole === 'client' && (
                  <Link href="/jobs/post" className="btn btn-primary btn-sm hidden sm:inline-flex">
                    <Briefcase className="w-3.5 h-3.5" /> Post a Job
                  </Link>
                )}
              </div>
            )}

            {/* Skeletons */}
            {isLoading && (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            )}

            {/* Jobs */}
            {!isLoading && data && (
              <>
                {data.jobs.length === 0 ? (
                  <div className="card p-12 text-center">
                    <Search className="w-10 h-10 text-[var(--faint)] mx-auto mb-3" />
                    <h3 className="font-semibold text-foreground mb-1">No jobs found</h3>
                    <p className="text-sm text-muted-foreground">Try adjusting your filters or search terms.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {data.jobs.map(job => (
                      <div key={job.id} onClick={() => saveRecentJob(job)}>
                        <JobCard job={job} freelancerSkills={freelancerSkills} saved={savedJobIds.has(job.id)} isFreelancer={userRole === 'freelancer'} />
                      </div>
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {data.total > 20 && (
                  <div className="flex justify-center gap-2 mt-6">
                    {Array.from({ length: Math.ceil(data.total / 20) }, (_, i) => i + 1).slice(0, 5).map(p => {
                      const cur = parseInt(sp.get('page') ?? '1')
                      const params = new URLSearchParams(sp.toString()); params.set('page', String(p))
                      return (
                        <Link key={p} href={`/jobs?${params}`}
                          className={cn(
                            'w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium transition-all',
                            cur === p
                              ? 'bg-[#14a800] text-foreground'
                              : 'bg-card border border-border text-foreground hover:border-[#14a800]'
                          )}>
                          {p}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default function JobsPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col min-h-screen bg-card">
        <Header />
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
          <div className="flex gap-6">
            <div className="hidden lg:block w-56" />
            <div className="flex-1 flex flex-col gap-3">{Array.from({length:6}).map((_,i)=><div key={i} className="card p-5 h-40 skeleton"/>)}</div>
          </div>
        </main>
      </div>
    }>
      <JobsContent />
    </Suspense>
  )
}

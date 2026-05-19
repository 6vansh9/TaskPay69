'use client'

import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Search, SlidersHorizontal, X, Briefcase } from 'lucide-react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import JobCard from '@/components/jobs/JobCard'
import JobFilters from '@/components/jobs/JobFilters'
import { useJobs, type JobFilters as IJobFilters } from '@/lib/hooks'
import { createClient } from '@/lib/supabase/client'
import { useEffect } from 'react'
import Link from 'next/link'

function SkeletonCard() {
  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="flex gap-2"><div className="skeleton h-5 w-20 rounded-full" /><div className="skeleton h-5 w-16 rounded-full" /></div>
      <div className="skeleton h-5 w-3/4" />
      <div className="skeleton h-4 w-full" />
      <div className="skeleton h-4 w-5/6" />
      <div className="flex gap-1.5"><div className="skeleton h-5 w-14 rounded-full" /><div className="skeleton h-5 w-16 rounded-full" /></div>
      <div className="flex justify-between pt-2 border-t border-[#e0e0e0]"><div className="skeleton h-4 w-24" /><div className="skeleton h-4 w-20" /></div>
    </div>
  )
}

function JobsContent() {
  const sp = useSearchParams()
  const router = useRouter()
  const [searchInput, setSearchInput] = useState(sp.get('q') ?? '')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [freelancerSkills, setFreelancerSkills] = useState<string[]>([])

  const filters: IJobFilters = {
    q: sp.get('q') ?? '',
    category: sp.get('category') ?? '',
    budget_type: sp.get('budget_type') ?? '',
    experience_level: sp.get('experience_level') ?? '',
    duration: sp.get('duration') ?? '',
    page: parseInt(sp.get('page') ?? '1'),
  }

  const { data, isLoading, isFetching } = useJobs(filters)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('skills, role').eq('id', user.id).single()
        .then(({ data: profile }) => {
          if (profile?.role === 'freelancer' && profile.skills) setFreelancerSkills(profile.skills)
        })
    })
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams(sp.toString())
    if (searchInput.trim()) params.set('q', searchInput.trim())
    else params.delete('q')
    params.delete('page')
    router.push(`/jobs?${params.toString()}`)
  }

  const activeFiltersCount = ['category','budget_type','experience_level','duration'].filter(k => sp.has(k)).length

  return (
    <div className="flex flex-col min-h-screen bg-[#f7f7f7]">
      <Header />

      {/* Top bar */}
      <div className="bg-white border-b border-[#e0e0e0] sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#aaa]" />
              <input
                type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
                placeholder="Search jobs by title, skill, or keyword…"
                className="input pl-9 pr-4"
              />
              {searchInput && (
                <button type="button" onClick={() => { setSearchInput(''); const p = new URLSearchParams(sp.toString()); p.delete('q'); router.push(`/jobs?${p}`) }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#aaa] hover:text-[#1d1d1d]">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button type="submit" className="btn btn-primary">Search</button>
            <button type="button" onClick={() => setFiltersOpen(v => !v)}
              className={`btn btn-secondary lg:hidden relative ${filtersOpen ? 'border-[#14a800] text-[#14a800]' : ''}`}>
              <SlidersHorizontal className="w-4 h-4" />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#14a800] text-white text-[10px] flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </form>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Sidebar filters - desktop */}
          <aside className="hidden lg:block w-56 flex-shrink-0 sticky top-36 self-start">
            <Suspense><JobFilters /></Suspense>
          </aside>

          {/* Mobile filter drawer */}
          {filtersOpen && (
            <div className="lg:hidden fixed inset-0 z-50 flex">
              <div className="absolute inset-0 bg-black/40" onClick={() => setFiltersOpen(false)} />
              <div className="relative bg-white w-72 h-full overflow-y-auto p-5 shadow-xl ml-auto">
                <Suspense><JobFilters onClose={() => setFiltersOpen(false)} /></Suspense>
              </div>
            </div>
          )}

          {/* Jobs list */}
          <div className="flex-1 min-w-0">
            {/* Results header */}
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-[#6b6b6b]">
                {isLoading ? 'Loading…' : (
                  <>
                    {isFetching && <span className="mr-2 text-[#14a800]">↻</span>}
                    <span className="font-semibold text-[#1d1d1d]">{data?.total ?? 0}</span> jobs found
                    {sp.get('q') && <span> for &quot;<em>{sp.get('q')}</em>&quot;</span>}
                  </>
                )}
              </div>
              <Link href="/jobs/post" className="btn btn-primary btn-sm hidden sm:inline-flex">
                <Briefcase className="w-3.5 h-3.5" /> Post a Job
              </Link>
            </div>

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
                    <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <h3 className="font-semibold text-[#1d1d1d] mb-1">No jobs found</h3>
                    <p className="text-sm text-[#6b6b6b]">Try adjusting your filters or search terms.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {data.jobs.map(job => (
                      <JobCard key={job.id} job={job} freelancerSkills={freelancerSkills} />
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
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium transition-all ${cur === p ? 'bg-[#14a800] text-white' : 'bg-white border border-[#e0e0e0] text-[#1d1d1d] hover:border-[#14a800]'}`}>
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
      <div className="flex flex-col min-h-screen bg-[#f7f7f7]">
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

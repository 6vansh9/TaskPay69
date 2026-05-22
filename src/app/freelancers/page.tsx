'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { Search, X, Star, MapPin, Shield, GraduationCap, Zap, SlidersHorizontal } from 'lucide-react'
import { useFreelancers, type FreelancerFilters } from '@/lib/hooks'
import { formatCurrency, cn } from '@/lib/utils'
import SaveFreelancerButton from '@/components/freelancers/SaveFreelancerButton'

const POPULAR_SKILLS = [
  'React', 'Node.js', 'Python', 'UI/UX Design', 'TypeScript',
  'Next.js', 'Flutter', 'Data Science', 'Copywriting', 'SEO',
]

const RATE_PRESETS = [
  { label: 'Any', min: 0, max: 0 },
  { label: 'Under ₹500/hr', min: 0, max: 500 },
  { label: '₹500–₹1,500/hr', min: 500, max: 1500 },
  { label: '₹1,500–₹3,000/hr', min: 1500, max: 3000 },
  { label: '₹3,000+/hr', min: 3000, max: 0 },
]

function SkeletonCard() {
  return (
    <div className="card p-5 flex gap-4">
      <div className="skeleton w-16 h-16 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2.5">
        <div className="skeleton h-4 w-36" />
        <div className="skeleton h-3.5 w-56" />
        <div className="flex gap-1.5 mt-1">
          <div className="skeleton h-5 w-14 rounded-full" />
          <div className="skeleton h-5 w-16 rounded-full" />
          <div className="skeleton h-5 w-12 rounded-full" />
        </div>
        <div className="skeleton h-3 w-full" />
      </div>
    </div>
  )
}

function FreelancerCard({ freelancer, savedInit = false }: { freelancer: import('@/lib/hooks').FreelancerProfile; savedInit?: boolean }) {
  const f = freelancer
  const skills = f.skills ?? []
  const initials = (f.full_name ?? 'F').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <Link href={`/profile/${f.id}`} className="card card-hover p-5 flex gap-4 group relative">
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {f.avatar_url ? (
          <img src={f.avatar_url} alt={f.full_name ?? ''} className="w-16 h-16 rounded-full object-cover" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-[#14a800]/20 flex items-center justify-center text-lg font-bold text-[#14a800]">
            {initials}
          </div>
        )}
        {f.is_available && (
          <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-[#14a800] border-2 border-border" title="Available now" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground group-hover:text-[#14a800] transition-colors truncate">
              {f.full_name ?? 'Freelancer'}
            </h3>
            {f.title && (
              <p className="text-sm text-muted-foreground truncate mt-0.5">{f.title}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {f.hourly_rate != null && f.hourly_rate > 0 && (
              <div className="text-right">
                <span className="font-bold text-[#14a800]">{formatCurrency(f.hourly_rate)}</span>
                <span className="text-xs text-[var(--faint)]">/hr</span>
              </div>
            )}
            <SaveFreelancerButton freelancerId={f.id} initialSaved={savedInit} />
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
          {f.rating > 0 && (
            <span className="flex items-center gap-1 text-amber-500 font-medium">
              <Star className="w-3 h-3 fill-current" />
              {f.rating.toFixed(1)}
              <span className="text-[var(--faint)] font-normal">({f.review_count})</span>
            </span>
          )}
          {f.jobs_completed > 0 && (
            <span>{f.jobs_completed} job{f.jobs_completed !== 1 ? 's' : ''} done</span>
          )}
          {f.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {f.location}
            </span>
          )}
        </div>

        {/* Verification badges */}
        {(f.phone_verified || f.edu_verified) && (
          <div className="flex items-center gap-1.5 mt-1.5">
            {f.phone_verified && (
              <span className="badge badge-green gap-0.5 text-[11px]">
                <Shield className="w-3 h-3" /> ID Verified
              </span>
            )}
            {f.edu_verified && (
              <span className="badge badge-blue gap-0.5 text-[11px]">
                <GraduationCap className="w-3 h-3" /> Student
              </span>
            )}
          </div>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {skills.slice(0, 5).map(s => (
              <span key={s} className="badge badge-gray text-[11px]">{s}</span>
            ))}
            {skills.length > 5 && (
              <span className="badge badge-gray text-[11px]">+{skills.length - 5}</span>
            )}
          </div>
        )}

        {/* Bio snippet */}
        {f.bio && (
          <p className="text-xs text-[var(--faint)] line-clamp-2 mt-2 leading-relaxed">{f.bio}</p>
        )}
      </div>
    </Link>
  )
}

function FreelancersContent() {
  const sp = useSearchParams()
  const router = useRouter()
  const [searchInput, setSearchInput] = useState(sp.get('q') ?? '')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [savedFreelancerIds, setSavedFreelancerIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/bookmarks/freelancers')
      .then(r => r.ok ? r.json() : { ids: [] })
      .then(({ ids }) => setSavedFreelancerIds(new Set(ids ?? [])))
      .catch(() => {})
  }, [])

  const filters: FreelancerFilters = {
    q:          sp.get('q')          ?? '',
    skill:      sp.get('skill')      ?? '',
    min_rate:   parseFloat(sp.get('min_rate') ?? '0') || undefined,
    max_rate:   parseFloat(sp.get('max_rate') ?? '0') || undefined,
    min_rating: parseFloat(sp.get('min_rating') ?? '0') || undefined,
    verified:   sp.get('verified') === 'true' || undefined,
    page:       parseInt(sp.get('page') ?? '1'),
  }

  const { data, isLoading, isFetching } = useFreelancers(filters)

  function setParam(key: string, value: string | null) {
    const p = new URLSearchParams(sp.toString())
    if (value) p.set(key, value); else p.delete(key)
    p.delete('page')
    router.push(`/freelancers?${p}`)
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setParam('q', searchInput.trim() || null)
  }

  const activeFiltersCount = ['skill', 'min_rate', 'max_rate', 'min_rating', 'verified'].filter(k => sp.has(k)).length
  const selectedSkill = sp.get('skill') ?? ''
  const selectedRate  = RATE_PRESETS.find(r =>
    String(r.min) === (sp.get('min_rate') ?? '0') &&
    String(r.max) === (sp.get('max_rate') ?? '0')
  )
  const verifiedOnly = sp.get('verified') === 'true'

  const FilterPanel = () => (
    <div className="space-y-5">
      {/* Popular skills */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Skills</p>
        <div className="flex flex-wrap gap-1.5">
          {POPULAR_SKILLS.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setParam('skill', selectedSkill === s ? null : s)}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                selectedSkill === s
                  ? 'bg-[#14a800] border-[#14a800] text-foreground'
                  : 'border-border text-muted-foreground hover:border-[#14a800] hover:text-foreground'
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Hourly rate */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Hourly Rate</p>
        <div className="space-y-1">
          {RATE_PRESETS.map(r => {
            const active = selectedRate?.label === r.label
            return (
              <button
                key={r.label}
                type="button"
                onClick={() => {
                  const p = new URLSearchParams(sp.toString())
                  if (active) { p.delete('min_rate'); p.delete('max_rate') }
                  else {
                    if (r.min > 0) p.set('min_rate', String(r.min)); else p.delete('min_rate')
                    if (r.max > 0) p.set('max_rate', String(r.max)); else p.delete('max_rate')
                  }
                  p.delete('page')
                  router.push(`/freelancers?${p}`)
                }}
                className={cn(
                  'w-full text-left px-2.5 py-1.5 rounded-lg text-sm transition-colors',
                  active ? 'bg-[#14a800]/10 text-[#14a800]' : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                )}
              >
                {r.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Min rating */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Minimum Rating</p>
        <div className="flex gap-1.5 flex-wrap">
          {[0, 3, 4, 4.5].map(r => {
            const active = parseFloat(sp.get('min_rating') ?? '0') === r
            return (
              <button
                key={r}
                type="button"
                onClick={() => setParam('min_rating', r > 0 ? String(r) : null)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                  active
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                    : 'border-border text-muted-foreground hover:border-amber-500/50 hover:text-amber-400'
                )}
              >
                {r === 0 ? 'Any' : `★ ${r}+`}
              </button>
            )
          })}
        </div>
      </div>

      {/* Verified only */}
      <div>
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            role="switch"
            aria-checked={verifiedOnly}
            onClick={() => setParam('verified', verifiedOnly ? null : 'true')}
            className={cn(
              'relative w-9 h-5 rounded-full transition-colors cursor-pointer',
              verifiedOnly ? 'bg-[#14a800]' : 'bg-muted'
            )}
          >
            <span className={cn(
              'absolute top-0.5 w-4 h-4 bg-card rounded-full shadow-sm transition-transform',
              verifiedOnly ? 'left-[calc(100%-18px)]' : 'left-0.5'
            )} />
          </div>
          <div className="flex items-center gap-1.5 text-sm text-foreground">
            <Shield className="w-3.5 h-3.5 text-[#14a800]" /> Verified only
          </div>
        </label>
      </div>

      {/* Clear */}
      {activeFiltersCount > 0 && (
        <button
          type="button"
          onClick={() => router.push('/freelancers')}
          className="w-full text-sm text-red-400 hover:text-red-300 py-1"
        >
          Clear all filters
        </button>
      )}
    </div>
  )

  return (
    <div className="flex flex-col min-h-screen bg-card">
      <Header />

      {/* Top bar */}
      <div className="bg-card border-b border-border sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--faint)]" />
              <input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Search by name, skill, or expertise…"
                className="input pl-9 pr-4"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => { setSearchInput(''); setParam('q', null) }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--faint)] hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button type="submit" className="btn btn-primary">Search</button>
            <button
              type="button"
              onClick={() => setFiltersOpen(v => !v)}
              className={cn('btn btn-secondary lg:hidden relative', filtersOpen && 'border-[#14a800] text-[#14a800]')}
            >
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
        <div className="flex gap-6">
          {/* Sidebar — desktop */}
          <aside className="hidden lg:block w-56 flex-shrink-0 sticky top-36 self-start">
            <FilterPanel />
          </aside>

          {/* Mobile filter drawer */}
          {filtersOpen && (
            <div className="lg:hidden fixed inset-0 z-50 flex">
              <div className="absolute inset-0 bg-black/40" onClick={() => setFiltersOpen(false)} />
              <div className="relative bg-card w-72 h-full overflow-y-auto p-5 shadow-xl ml-auto">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-foreground">Filters</h2>
                  <button onClick={() => setFiltersOpen(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
                </div>
                <FilterPanel />
              </div>
            </div>
          )}

          {/* Main list */}
          <div className="flex-1 min-w-0">
            {/* Active filter chips */}
            {(selectedSkill || verifiedOnly || sp.get('min_rating') || sp.get('min_rate')) && (
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedSkill && (
                  <button onClick={() => setParam('skill', null)}
                    className="flex items-center gap-1 px-3 py-1 rounded-full bg-[#14a800]/10 border border-[#14a800]/30 text-sm text-[#14a800]">
                    {selectedSkill} <X className="w-3 h-3" />
                  </button>
                )}
                {sp.get('min_rating') && (
                  <button onClick={() => setParam('min_rating', null)}
                    className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-sm text-amber-400">
                    ★ {sp.get('min_rating')}+ <X className="w-3 h-3" />
                  </button>
                )}
                {(sp.get('min_rate') || sp.get('max_rate')) && (
                  <button onClick={() => { const p = new URLSearchParams(sp.toString()); p.delete('min_rate'); p.delete('max_rate'); router.push(`/freelancers?${p}`) }}
                    className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/5 border border-border text-sm text-foreground">
                    {selectedRate?.label ?? 'Custom rate'} <X className="w-3 h-3" />
                  </button>
                )}
                {verifiedOnly && (
                  <button onClick={() => setParam('verified', null)}
                    className="flex items-center gap-1 px-3 py-1 rounded-full bg-[#14a800]/10 border border-[#14a800]/30 text-sm text-[#14a800]">
                    <Shield className="w-3 h-3" /> Verified <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            {/* Results count */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                {isLoading ? 'Loading…' : (
                  <>
                    {isFetching && <span className="mr-2 text-[#14a800]">↻</span>}
                    <span className="font-semibold text-foreground">{data?.total ?? 0}</span> freelancers found
                    {sp.get('q') && <span> for &quot;<em>{sp.get('q')}</em>&quot;</span>}
                  </>
                )}
              </p>
            </div>

            {/* Skeletons */}
            {isLoading && (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            )}

            {/* Freelancer cards */}
            {!isLoading && (
              <>
                {(data?.freelancers.length ?? 0) === 0 ? (
                  <div className="card p-12 text-center">
                    <Zap className="w-10 h-10 text-[var(--faint)] mx-auto mb-3" />
                    <h3 className="font-semibold text-foreground mb-1">No freelancers found</h3>
                    <p className="text-sm text-muted-foreground">Try adjusting your filters or search terms.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {data!.freelancers.map(f => (
                      <FreelancerCard key={f.id} freelancer={f} savedInit={savedFreelancerIds.has(f.id)} />
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {(data?.total ?? 0) > 20 && (
                  <div className="flex justify-center gap-2 mt-6">
                    {Array.from({ length: Math.ceil(data!.total / 20) }, (_, i) => i + 1).slice(0, 5).map(p => {
                      const cur = parseInt(sp.get('page') ?? '1')
                      const params = new URLSearchParams(sp.toString()); params.set('page', String(p))
                      return (
                        <Link key={p} href={`/freelancers?${params}`}
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

export default function FreelancersPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col min-h-screen bg-card">
        <Header />
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
          <div className="flex gap-6">
            <div className="hidden lg:block w-56" />
            <div className="flex-1 flex flex-col gap-3">{Array.from({length:8}).map((_,i) => <div key={i} className="card p-5 h-32 skeleton"/>)}</div>
          </div>
        </main>
      </div>
    }>
      <FreelancersContent />
    </Suspense>
  )
}

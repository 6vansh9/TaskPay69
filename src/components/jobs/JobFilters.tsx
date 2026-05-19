'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { X } from 'lucide-react'

const CATEGORIES = ['Web Development','Mobile Apps','UI/UX Design','Data Science','Content Writing','Digital Marketing','Video Editing','Graphic Design']
const DURATIONS   = ['Less than 1 week','1–4 weeks','1–3 months','3+ months']
const LEVELS      = ['entry','intermediate','expert']
const LEVEL_LABELS: Record<string, string> = { entry: 'Entry Level', intermediate: 'Intermediate', expert: 'Expert' }

interface Props { onClose?: () => void }

export default function JobFilters({ onClose }: Props) {
  const router = useRouter()
  const sp = useSearchParams()

  const setFilter = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(sp.toString())
    if (params.get(key) === value) params.delete(key)
    else params.set(key, value)
    params.delete('page')
    router.push(`/jobs?${params.toString()}`)
    onClose?.()
  }, [sp, router, onClose])

  const clearAll = () => { router.push('/jobs'); onClose?.() }

  const active = (key: string, value: string) => sp.get(key) === value
  const hasFilters = ['category', 'budget_type', 'experience_level', 'duration'].some(k => sp.has(k))

  const Chip = ({ label, filterKey, value }: { label: string; filterKey: string; value: string }) => (
    <button
      onClick={() => setFilter(filterKey, value)}
      className={`text-sm px-3 py-1.5 rounded-full border transition-all ${
        active(filterKey, value)
          ? 'bg-[#14a800] text-white border-[#14a800]'
          : 'bg-white text-[#1d1d1d] border-[#e0e0e0] hover:border-[#14a800] hover:text-[#14a800]'
      }`}
    >
      {label}
    </button>
  )

  return (
    <aside className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[#1d1d1d]">Filters</h3>
        <div className="flex items-center gap-2">
          {hasFilters && (
            <button onClick={clearAll} className="text-xs text-[#14a800] hover:underline flex items-center gap-1">
              <X className="w-3 h-3" /> Clear all
            </button>
          )}
          {onClose && <button onClick={onClose} className="text-[#6b6b6b] hover:text-[#1d1d1d] lg:hidden"><X className="w-4 h-4" /></button>}
        </div>
      </div>

      {/* Budget type */}
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#6b6b6b] mb-2">Budget Type</p>
        <div className="flex flex-col gap-1.5">
          <Chip label="Fixed Price" filterKey="budget_type" value="fixed" />
          <Chip label="Hourly Rate" filterKey="budget_type" value="hourly" />
        </div>
      </div>

      <div className="divider mb-5" />

      {/* Experience level */}
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#6b6b6b] mb-2">Experience Level</p>
        <div className="flex flex-col gap-1.5">
          {LEVELS.map(l => <Chip key={l} label={LEVEL_LABELS[l]} filterKey="experience_level" value={l} />)}
        </div>
      </div>

      <div className="divider mb-5" />

      {/* Duration */}
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#6b6b6b] mb-2">Project Length</p>
        <div className="flex flex-col gap-1.5">
          {DURATIONS.map(d => <Chip key={d} label={d} filterKey="duration" value={d} />)}
        </div>
      </div>

      <div className="divider mb-5" />

      {/* Category */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#6b6b6b] mb-2">Category</p>
        <div className="flex flex-col gap-1.5">
          {CATEGORIES.map(c => <Chip key={c} label={c} filterKey="category" value={c} />)}
        </div>
      </div>
    </aside>
  )
}

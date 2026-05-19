'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Bookmark, Users, Clock, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { timeAgo, formatCurrency, cn } from '@/lib/utils'
import type { JobWithProfile } from '@/lib/hooks'

interface Props {
  job: JobWithProfile
  freelancerSkills?: string[]
  saved?: boolean
}

function SkillMatchBadge({ job, freelancerSkills }: { job: JobWithProfile; freelancerSkills: string[] }) {
  const jobSkills = job.skills ?? job.skills_required ?? []
  if (!jobSkills.length) return null
  const matched = jobSkills.filter(s => freelancerSkills.map(x => x.toLowerCase()).includes(s.toLowerCase()))
  const pct = Math.round((matched.length / jobSkills.length) * 100)
  const color = pct >= 70 ? 'badge-green' : pct >= 40 ? 'badge-orange' : 'badge-gray'
  return <span className={`badge ${color}`}>{pct}% match</span>
}

export default function JobCard({ job, freelancerSkills = [], saved: savedInit = false }: Props) {
  const [bidCount, setBidCount] = useState(job.proposals_count ?? job.bid_count ?? 0)
  const [saved, setSaved] = useState(savedInit)

  // Real-time bid count subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`job-bid-count-${job.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'jobs',
        filter: `id=eq.${job.id}`,
      }, (payload) => {
        const updated = payload.new as { proposals_count?: number; bid_count?: number }
        setBidCount(updated.proposals_count ?? updated.bid_count ?? bidCount)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [job.id])

  const skills = job.skills ?? job.skills_required ?? []
  const budgetLabel = job.budget_type === 'fixed'
    ? `${formatCurrency(job.budget_min ?? 0)}–${formatCurrency(job.budget_max ?? 0)}`
    : `${formatCurrency(job.budget_min ?? 0)}/hr`

  const experienceColor: Record<string, string> = {
    entry: 'badge-blue', intermediate: 'badge-orange', expert: 'badge-purple',
  }

  return (
    <div className="card card-hover p-5 flex flex-col gap-3 transition-all cursor-pointer group">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {job.category && <span className="badge badge-gray">{job.category}</span>}
          <span className={`badge ${experienceColor[job.level ?? job.experience_level] ?? 'badge-gray'}`}>
            {(job.level ?? job.experience_level ?? '').replace('_', ' ')}
          </span>
          {freelancerSkills.length > 0 && <SkillMatchBadge job={job} freelancerSkills={freelancerSkills} />}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-[#6b6b6b] whitespace-nowrap">{timeAgo(job.created_at)}</span>
          <button
            onClick={(e) => { e.preventDefault(); setSaved(v => !v) }}
            className={cn('p-1.5 rounded-full hover:bg-gray-100 transition-colors', saved ? 'text-[#14a800]' : 'text-gray-400')}
            aria-label="Save job"
          >
            <Bookmark className="w-4 h-4" fill={saved ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>

      {/* Title */}
      <Link href={`/jobs/${job.id}`}>
        <h3 className="font-semibold text-[#1d1d1d] text-base group-hover:text-[#14a800] transition-colors line-clamp-2">
          {job.title}
        </h3>
      </Link>

      {/* Description */}
      {job.description && (
        <p className="text-sm text-[#6b6b6b] line-clamp-3 leading-relaxed">{job.description}</p>
      )}

      {/* Skills */}
      {skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {skills.slice(0, 5).map(s => (
            <span key={s} className="badge badge-gray text-[11px]">{s}</span>
          ))}
          {skills.length > 5 && <span className="badge badge-gray text-[11px]">+{skills.length - 5}</span>}
        </div>
      )}

      {/* Budget + duration */}
      <div className="flex items-center gap-3 text-sm text-[#1d1d1d] flex-wrap">
        <span className="font-semibold text-[#14a800]">{budgetLabel}</span>
        {job.duration && (
          <span className="flex items-center gap-1 text-[#6b6b6b]">
            <Clock className="w-3.5 h-3.5" /> {job.duration}
          </span>
        )}
        {job.profiles?.company_name && (
          <span className="flex items-center gap-1 text-[#6b6b6b]">
            <MapPin className="w-3.5 h-3.5" /> {job.profiles.company_name}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-[#e0e0e0]">
        <div className="flex items-center gap-1.5 text-xs text-[#6b6b6b]">
          <Users className="w-3.5 h-3.5" />
          <span>{bidCount === 0 ? 'Be the first to apply' : `${bidCount} proposal${bidCount !== 1 ? 's' : ''}`}</span>
        </div>
        {job.profiles && (
          <div className="flex items-center gap-1.5">
            {job.profiles.avatar_url ? (
              <img src={job.profiles.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600">
                {(job.profiles.full_name ?? job.profiles.company_name ?? 'C')[0].toUpperCase()}
              </div>
            )}
            <span className="text-xs text-[#6b6b6b] truncate max-w-[120px]">
              {job.profiles.company_name ?? job.profiles.full_name}
            </span>
            {job.profiles.rating > 0 && (
              <span className="text-xs text-amber-500 font-medium">★ {job.profiles.rating.toFixed(1)}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

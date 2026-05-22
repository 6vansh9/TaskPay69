'use client'

import { useState, useEffect } from 'react'
import { X, Briefcase, Send, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface OpenJob {
  id: string
  title: string
  category: string | null
  proposals_count: number
}

interface Props {
  freelancerId: string
  freelancerName: string
  onClose: () => void
}

export default function InviteToJobModal({ freelancerId, freelancerName, onClose }: Props) {
  const [jobs, setJobs] = useState<OpenJob[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase
        .from('jobs')
        .select('id, title, category, proposals_count')
        .eq('client_id', user.id)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(20)
      setJobs((data ?? []) as OpenJob[])
      setLoading(false)
    })
  }, [])

  async function handleInvite() {
    if (!selected) return
    setSending(true)
    try {
      const res = await fetch(`/api/jobs/${selected}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ freelancer_id: freelancerId }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Invite failed')
      } else {
        setSent(selected)
        toast.success(`Invite sent to ${freelancerName}!`)
      }
    } catch {
      toast.error('Network error')
    }
    setSending(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="text-sm font-bold text-foreground">Invite to a Job</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{freelancerName}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 max-h-72 overflow-y-auto">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-12 rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-8">
              <Briefcase className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No open jobs to invite to.</p>
              <a href="/jobs/post" className="text-xs text-[#14a800] hover:underline mt-1 block">Post a new job →</a>
            </div>
          ) : (
            <div className="space-y-2">
              {jobs.map(job => (
                <button
                  key={job.id}
                  onClick={() => setSelected(job.id)}
                  className={cn(
                    'w-full text-left px-4 py-3 rounded-xl border transition-all',
                    selected === job.id
                      ? 'border-[#14a800]/60 bg-[#14a800]/8 text-foreground'
                      : 'border-border hover:border-[#14a800]/30 text-foreground',
                    sent === job.id && 'border-[#14a800]/60 bg-[#14a800]/10'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{job.title}</p>
                      <p className="text-xs text-muted-foreground">{job.category ?? 'General'} · {job.proposals_count} proposals</p>
                    </div>
                    {sent === job.id && <CheckCircle className="w-4 h-4 text-[#14a800] flex-shrink-0" />}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {jobs.length > 0 && (
          <div className="p-4 border-t border-border">
            <button
              onClick={handleInvite}
              disabled={!selected || sending || sent === selected}
              className="btn btn-primary w-full gap-2 disabled:opacity-50"
            >
              {sending ? (
                <span className="flex items-center gap-2"><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Sending…</span>
              ) : sent === selected ? (
                <><CheckCircle className="w-4 h-4" />Invite Sent</>
              ) : (
                <><Send className="w-4 h-4" />Send Invite</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

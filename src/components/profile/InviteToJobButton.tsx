'use client'

import { useState } from 'react'
import { Mail, ChevronDown, Check, Loader2 } from 'lucide-react'

interface Job { id: string; title: string }

export default function InviteToJobButton({
  freelancerId,
  freelancerName,
  jobs,
}: {
  freelancerId: string
  freelancerName: string
  jobs: Job[]
}) {
  const [open, setOpen] = useState(false)
  const [sending, setSending] = useState<string | null>(null)
  const [sent, setSent] = useState<Set<string>>(new Set())

  if (jobs.length === 0) return null

  async function invite(jobId: string) {
    if (sent.has(jobId)) return
    setSending(jobId)
    try {
      await fetch(`/api/jobs/${jobId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ freelancer_id: freelancerId }),
      })
      setSent(prev => new Set([...prev, jobId]))
    } finally {
      setSending(null)
    }
  }

  const allSent = jobs.every(j => sent.has(j.id))

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
          allSent
            ? 'border-[#14a800]/40 bg-[#14a800]/10 text-[#14a800]'
            : 'border-border text-foreground/70 hover:border-[#14a800]/50 hover:text-[#14a800]'
        }`}
      >
        <Mail className="w-4 h-4" />
        {allSent ? 'Invites sent' : 'Invite to Job'}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-72 bg-card border border-border rounded-xl shadow-2xl z-20 overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-sm font-semibold text-foreground">
                Invite {freelancerName} to apply
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Select a job to send the invite</p>
            </div>
            <div className="max-h-60 overflow-y-auto py-1">
              {jobs.map(job => {
                const isSent    = sent.has(job.id)
                const isLoading = sending === job.id
                return (
                  <button
                    key={job.id}
                    onClick={() => invite(job.id)}
                    disabled={isSent || isLoading}
                    className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors text-left disabled:cursor-default"
                  >
                    <span className="text-foreground truncate">{job.title}</span>
                    {isSent ? (
                      <span className="inline-flex items-center gap-1 text-[#14a800] text-xs font-semibold flex-shrink-0">
                        <Check className="w-3.5 h-3.5" /> Sent
                      </span>
                    ) : isLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground flex-shrink-0" />
                    ) : (
                      <span className="text-xs text-[#14a800] font-semibold flex-shrink-0 hover:underline">Invite →</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

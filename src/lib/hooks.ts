import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// ── Jobs ──────────────────────────────────────────────────────────

export interface JobFilters {
  q?: string
  category?: string
  budget_type?: string
  experience_level?: string
  duration?: string
  page?: number
}

export function useJobs(filters: JobFilters = {}) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, String(v)) })
  return useQuery({
    queryKey: ['jobs', filters],
    queryFn: async () => {
      const res = await fetch(`/api/jobs?${params}`)
      if (!res.ok) throw new Error('Failed to fetch jobs')
      return res.json() as Promise<{ jobs: JobWithProfile[]; total: number }>
    },
  })
}

export function useJob(id: string) {
  return useQuery({
    queryKey: ['job', id],
    queryFn: async () => {
      const res = await fetch(`/api/jobs/${id}`)
      if (!res.ok) throw new Error('Job not found')
      return res.json() as Promise<JobWithProfile>
    },
    enabled: !!id,
  })
}

export function useCreateJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateJobInput) => {
      const res = await fetch('/api/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed to create job') }
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  })
}

// ── Proposals ────────────────────────────────────────────────────

export function useProposals(jobId: string) {
  return useQuery({
    queryKey: ['proposals', jobId],
    queryFn: async () => {
      const res = await fetch(`/api/proposals?jobId=${jobId}`)
      if (!res.ok) throw new Error('Failed to fetch proposals')
      return res.json() as Promise<ProposalWithProfile[]>
    },
    enabled: !!jobId,
  })
}

export function useSubmitProposal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: SubmitProposalInput) => {
      const res = await fetch('/api/proposals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed to submit proposal') }
      return res.json()
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['proposals', vars.job_id] }),
  })
}

export function useShortlistProposal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ proposalId, jobId }: { proposalId: string; jobId: string }) => {
      const res = await fetch(`/api/proposals/${proposalId}/shortlist`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to shortlist')
      return res.json()
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['proposals', vars.jobId] }),
  })
}

export function useHireFreelancer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ proposalId, jobId }: { proposalId: string; jobId: string }) => {
      const res = await fetch(`/api/proposals/${proposalId}/hire`, { method: 'POST' })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Hire failed') }
      return res.json()
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['proposals', vars.jobId] })
      qc.invalidateQueries({ queryKey: ['job', vars.jobId] })
    },
  })
}

// ── Type helpers (minimal, avoids duplicating DB types) ──────────

export interface JobWithProfile {
  id: string; title: string; description: string | null; category: string | null
  budget_type: string; budget_min: number | null; budget_max: number | null
  experience_level: string; duration: string | null; status: string
  bid_count: number; proposals_count: number; created_at: string
  skills: string[]; skills_required: string[] | null; job_type: string; level: string
  client_id: string
  profiles: { full_name: string | null; avatar_url: string | null; company_name: string | null; rating: number; review_count: number } | null
}

export interface ProposalWithProfile {
  id: string; job_id: string; freelancer_id: string; cover_letter: string
  bid_amount: number | null; delivery_days: number | null; status: string
  is_shortlisted: boolean; connects_used: number; created_at: string
  profiles: {
    full_name: string | null; avatar_url: string | null; title: string | null
    rating: number; review_count: number; jobs_completed: number
    skills: string[] | null; location: string | null; hourly_rate: number | null
    phone_verified: boolean; edu_verified: boolean
  } | null
}

export interface CreateJobInput {
  title: string; category: string; description: string
  budget_type: 'fixed' | 'hourly'; budget_min: number; budget_max: number
  skills: string[]; experience_level: string; duration: string
  job_type: 'fixed' | 'hourly'
}

export interface SubmitProposalInput {
  job_id: string; cover_letter: string; bid_amount: number
  delivery_days: number; attachment_url?: string
}

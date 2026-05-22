'use client'

import { Suspense, useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Zap, AlertCircle, Sparkles, Loader2 } from 'lucide-react'
import Header from '@/components/layout/Header'
import { useSubmitProposal } from '@/lib/hooks'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, cn } from '@/lib/utils'
import toast from 'react-hot-toast'

function connectsCost(budgetMax: number | null): number {
  if (!budgetMax) return 2
  if (budgetMax < 50000) return 2
  if (budgetMax < 500000) return 4
  return 6
}

interface JobInfo {
  title: string
  description: string | null
  budget_type: string
  budget_min: number | null
  budget_max: number | null
  category: string | null
}

interface FreelancerProfile {
  full_name: string | null
  skills: string[] | null
  bio: string | null
}

function ApplyContent() {
  const params = useParams()
  const router = useRouter()
  const jobId = params.id as string
  const { mutate: submit, isPending } = useSubmitProposal()

  const [jobInfo, setJobInfo] = useState<JobInfo | null>(null)
  const [freelancerProfile, setFreelancerProfile] = useState<FreelancerProfile | null>(null)
  const [connectsBalance, setConnectsBalance] = useState(0)
  const [form, setForm] = useState({ cover_letter: '', bid_amount: '', delivery_days: '', attachment_url: '' })
  const [errors, setErrors] = useState<Partial<typeof form>>({})
  const [loading, setLoading] = useState(true)
  const [generatingLetter, setGeneratingLetter] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push(`/auth/login?next=/jobs/${jobId}/apply`); return }

      const [{ data: job }, { data: profile }] = await Promise.all([
        supabase.from('jobs').select('title, description, budget_type, budget_min, budget_max, category, status').eq('id', jobId).single(),
        supabase.from('profiles').select('role, connects_balance, full_name, skills, bio').eq('id', user.id).single(),
      ])

      if (!job || (job as { status: string }).status !== 'open') {
        toast.error('This job is no longer available'); router.push('/jobs'); return
      }
      if ((profile as { role: string } | null)?.role !== 'freelancer') {
        toast.error('Only freelancers can submit proposals'); router.push(`/jobs/${jobId}`); return
      }

      // Fix 406: use maybeSingle() so no error when row doesn't exist
      const { data: existing } = await supabase
        .from('proposals')
        .select('id')
        .eq('job_id', jobId)
        .eq('freelancer_id', user.id)
        .maybeSingle()
      if (existing) { toast.error('You already applied to this job'); router.push(`/jobs/${jobId}`); return }

      setJobInfo(job as unknown as JobInfo)
      const p = profile as unknown as { role: string; connects_balance: number; full_name: string | null; skills: string[] | null; bio: string | null }
      setFreelancerProfile({ full_name: p.full_name, skills: p.skills, bio: p.bio })
      setConnectsBalance(p.connects_balance ?? 0)
      setLoading(false)
    })
  }, [jobId, router])

  const cost = connectsCost(jobInfo?.budget_max ?? null)
  const hasEnoughConnects = connectsBalance >= cost

  const validate = () => {
    const e: Partial<typeof form> = {}
    if (form.cover_letter.length < 100) e.cover_letter = `Cover letter must be at least 100 characters (${form.cover_letter.length}/100)`
    if (form.cover_letter.length > 1500) e.cover_letter = 'Maximum 1500 characters'
    if (!form.bid_amount || parseFloat(form.bid_amount) <= 0) e.bid_amount = 'Enter your bid amount'
    if (!form.delivery_days || parseInt(form.delivery_days) < 1) e.delivery_days = 'Enter estimated delivery days'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    submit({
      job_id: jobId,
      cover_letter: form.cover_letter,
      bid_amount: parseFloat(form.bid_amount),
      delivery_days: parseInt(form.delivery_days),
      attachment_url: form.attachment_url || undefined,
    }, {
      onSuccess: () => { toast.success('Proposal submitted!'); router.push(`/jobs/${jobId}`) },
      onError: (err) => toast.error(err.message),
    })
  }

  async function handleGenerateLetter() {
    if (!jobInfo) return
    setGeneratingLetter(true)
    try {
      const res = await fetch('/api/ai/generate-cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          freelancer_name: freelancerProfile?.full_name ?? 'the freelancer',
          skills: freelancerProfile?.skills ?? [],
          bio: freelancerProfile?.bio ?? '',
          job_title: jobInfo.title,
          job_description: jobInfo.description ?? '',
          category: jobInfo.category ?? '',
        }),
      })
      let data: { cover_letter?: string; error?: string }
      try { data = await res.json() } catch { data = {} }
      if (!res.ok || !data.cover_letter) {
        toast.error(data.error ?? 'AI generation failed. Check your GROQ_API_KEY.')
        return
      }
      setForm(f => ({ ...f, cover_letter: data.cover_letter! }))
      toast.success('Cover letter generated!')
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setGeneratingLetter(false)
    }
  }

  if (loading) return (
    <div className="flex flex-col min-h-screen bg-card"><Header />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="card p-5"><div className="skeleton h-20 w-full rounded-lg" /></div>)}
      </main>
    </div>
  )

  return (
    <div className="flex flex-col min-h-screen bg-card">
      <Header />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-6">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-4 flex items-center gap-1">
          <Link href="/jobs" className="hover:text-[#14a800]">Jobs</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href={`/jobs/${jobId}`} className="hover:text-[#14a800] truncate max-w-[160px]">{jobInfo?.title}</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground">Apply</span>
        </nav>

        {/* Job summary */}
        <div className="card p-4 mb-4 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="font-semibold text-foreground">{jobInfo?.title}</h2>
            {jobInfo?.category && <span className="badge badge-gray mt-1">{jobInfo.category}</span>}
          </div>
          <div className="text-right">
            <div className="font-bold text-[#14a800]">
              {jobInfo?.budget_type === 'fixed'
                ? `${formatCurrency(jobInfo.budget_min ?? 0)} – ${formatCurrency(jobInfo.budget_max ?? 0)}`
                : `${formatCurrency(jobInfo?.budget_min ?? 0)}/hr`}
            </div>
            <div className="text-xs text-muted-foreground capitalize">{jobInfo?.budget_type}</div>
          </div>
        </div>

        {/* Connects warning */}
        {!hasEnoughConnects && (
          <div className="flex items-center gap-3 bg-red-950/30 border border-red-900/50 rounded-xl p-4 mb-4">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-400">Not enough connects</p>
              <p className="text-xs text-red-600">This job costs {cost} connects. You have {connectsBalance}.</p>
            </div>
            <Link href="/connects" className="text-xs font-semibold text-[#14a800] bg-[#14a800]/10 hover:bg-[#14a800]/20 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
              Buy Connects →
            </Link>
          </div>
        )}

        {hasEnoughConnects && (
          <div className="flex items-center gap-3 bg-[#14a800/10] border border-[#14a800]/30 rounded-xl p-4 mb-4">
            <Zap className="w-4 h-4 text-[#14a800] flex-shrink-0" />
            <p className="text-sm text-[#14a800]">
              Submitting uses <strong>{cost} connects</strong>. You have <strong>{connectsBalance}</strong> remaining.
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="card p-6 space-y-5">
          <h1 className="text-xl font-bold text-foreground">Submit your proposal</h1>

          {/* Bid amount */}
          <div className="field">
            <label className="label">
              Your bid ({jobInfo?.budget_type === 'hourly' ? '₹/hr' : '₹ fixed price'}) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
              <input
                type="number" value={form.bid_amount}
                onChange={e => setForm(f => ({ ...f, bid_amount: e.target.value }))}
                className="input pl-7" placeholder="0" min="1"
              />
            </div>
            {errors.bid_amount && <p className="field-error">{errors.bid_amount}</p>}
          </div>

          {/* Delivery days */}
          <div className="field">
            <label className="label">Estimated delivery (days) <span className="text-red-500">*</span></label>
            <input
              type="number" value={form.delivery_days}
              onChange={e => setForm(f => ({ ...f, delivery_days: e.target.value }))}
              className="input w-32" placeholder="7" min="1" max="365"
            />
            {errors.delivery_days && <p className="field-error">{errors.delivery_days}</p>}
          </div>

          {/* Cover letter */}
          <div className="field">
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">Cover letter <span className="text-red-500">*</span></label>
              <button
                type="button"
                onClick={handleGenerateLetter}
                disabled={generatingLetter}
                className="flex items-center gap-1.5 text-xs text-[#14a800] hover:text-[#12c200] disabled:opacity-50 transition-colors font-medium"
              >
                {generatingLetter
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</>
                  : <><Sparkles className="w-3.5 h-3.5" /> Generate with AI</>}
              </button>
            </div>
            <textarea
              value={form.cover_letter}
              onChange={e => setForm(f => ({ ...f, cover_letter: e.target.value }))}
              className="input" rows={10} maxLength={1500}
              placeholder="Introduce yourself and explain why you're the perfect fit for this project. Mention relevant experience, how you'd approach the work, and any questions you have…"
            />
            <div className="flex justify-between">
              {errors.cover_letter && <p className="field-error flex-1">{errors.cover_letter}</p>}
              <span className={cn('text-xs ml-auto', form.cover_letter.length > 1400 ? 'text-amber-500' : form.cover_letter.length < 100 ? 'text-muted-foreground' : 'text-[#14a800]')}>
                {form.cover_letter.length}/1500
              </span>
            </div>
          </div>

          {/* Optional attachment */}
          <div className="field">
            <label className="label">Portfolio / attachment link <span className="text-[var(--faint)] font-normal">(optional)</span></label>
            <input
              type="url" value={form.attachment_url}
              onChange={e => setForm(f => ({ ...f, attachment_url: e.target.value }))}
              className="input" placeholder="https://your-portfolio.com/project"
            />
          </div>

          {/* Submit */}
          <div className="flex items-center justify-between pt-2">
            <Link href={`/jobs/${jobId}`} className="btn btn-secondary">Cancel</Link>
            <button
              type="submit"
              disabled={isPending || !hasEnoughConnects}
              className="btn btn-primary btn-lg"
            >
              {isPending ? 'Submitting…' : `Submit Proposal · ${cost} connects`}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}

export default function ApplyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-card">
        <Header />
        <main className="max-w-2xl mx-auto px-4 py-8 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="card p-5 h-32 skeleton" />)}
        </main>
      </div>
    }>
      <ApplyContent />
    </Suspense>
  )
}

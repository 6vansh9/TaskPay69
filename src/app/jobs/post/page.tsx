'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronRight, ChevronLeft, Briefcase, Sparkles, Loader2 } from 'lucide-react'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import SkillInput from '@/components/jobs/SkillInput'
import { useCreateJob } from '@/lib/hooks'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const CATEGORIES = ['Web Development','Mobile Apps','UI/UX Design','Data Science','Content Writing','Digital Marketing','Video Editing','Graphic Design']
const DURATIONS  = ['Less than 1 week','1–4 weeks','1–3 months','3+ months']

const TITLE_SUGGESTIONS: Record<string, string[]> = {
  'Web Development': ['Full Stack Web App Development','React Frontend Developer Needed','Node.js Backend API Development','E-commerce Website Build','Next.js Landing Page'],
  'Mobile Apps':     ['React Native Mobile App','Flutter iOS & Android App','Android App Development','iOS Swift App Build'],
  'UI/UX Design':    ['UI/UX Design for Mobile App','Website Redesign & Prototyping','Design System Creation','User Research & Wireframing'],
  'Data Science':    ['Machine Learning Model Development','Data Analysis & Visualization','Python Data Pipeline','NLP Model for Text Classification'],
  'Content Writing': ['Blog Content Writing (10 articles)','Product Descriptions for E-commerce','Technical Documentation','Email Newsletter Copy'],
  'Digital Marketing':['SEO Audit & Strategy','Google Ads Campaign Management','Social Media Content Calendar','LinkedIn Growth Campaign'],
  'Video Editing':   ['YouTube Video Editing (5 videos)','Corporate Explainer Video','Reels & Short-form Content','Motion Graphics Animation'],
  'Graphic Design':  ['Brand Identity & Logo Design','Social Media Graphics Pack','Pitch Deck Design','Packaging & Label Design'],
}

const STEPS = ['Job Details', 'Requirements', 'Budget & Review']

interface FormData {
  title: string; category: string; description: string
  skills: string[]; experience_level: string; duration: string; job_type: 'fixed' | 'hourly'
  budget_min: string; budget_max: string
}

export default function PostJobPage() {
  const router = useRouter()
  const { mutate: createJob, isPending } = useCreateJob()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormData>({
    title: '', category: '', description: '',
    skills: [], experience_level: 'intermediate', duration: '1–4 weeks', job_type: 'fixed',
    budget_min: '', budget_max: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [showTitleSuggestions, setShowTitleSuggestions] = useState(false)
  const [generatingDesc, setGeneratingDesc] = useState(false)
  const titleRef = useRef<HTMLDivElement>(null)

  const set = (key: keyof FormData, value: FormData[keyof FormData]) =>
    setForm(f => ({ ...f, [key]: value }))

  async function handleGenerateDescription() {
    if (!form.title.trim()) { toast.error('Add a job title first'); return }
    setGeneratingDesc(true)
    try {
      const res = await fetch('/api/ai/generate-job-description', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: form.title, category: form.category }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Generation failed'); return }
      set('description', data.description)
      toast.success('Description generated!')
    } finally {
      setGeneratingDesc(false)
    }
  }

  // ── Step validation ────────────────────────────────────────────
  const validateStep = (s: number): boolean => {
    const e: Partial<Record<keyof FormData, string>> = {}
    if (s === 0) {
      if (!form.title.trim()) e.title = 'Title is required'
      else if (form.title.length > 100) e.title = 'Max 100 characters'
      if (!form.category) e.category = 'Select a category'
      if (!form.description.trim()) e.description = 'Description is required'
      else if (form.description.length < 50) e.description = 'At least 50 characters'
    }
    if (s === 1) {
      if (!form.skills.length) e.skills = 'Add at least one skill'
    }
    if (s === 2) {
      if (!form.budget_min || parseFloat(form.budget_min) <= 0) e.budget_min = 'Enter minimum budget'
      if (!form.budget_max || parseFloat(form.budget_max) <= 0) e.budget_max = 'Enter maximum budget'
      if (parseFloat(form.budget_max) < parseFloat(form.budget_min)) e.budget_max = 'Max must be ≥ min'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const next = () => { if (validateStep(step)) setStep(s => s + 1) }
  const back = () => { setErrors({}); setStep(s => s - 1) }

  const submit = () => {
    if (!validateStep(2)) return
    createJob({
      title: form.title.trim(),
      category: form.category,
      description: form.description.trim(),
      budget_type: form.job_type,
      budget_min: parseFloat(form.budget_min),
      budget_max: parseFloat(form.budget_max),
      skills: form.skills,
      experience_level: form.experience_level,
      duration: form.duration,
      job_type: form.job_type,
    }, {
      onSuccess: (job) => { toast.success('Job posted!'); router.push(`/jobs/${job.id}`) },
      onError: (e) => toast.error(e.message),
    })
  }

  const pct = ((step + 1) / STEPS.length) * 100

  return (
    <div className="min-h-screen bg-card">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-10">
        {/* Breadcrumb */}
        <div className="text-sm text-muted-foreground mb-6">
          <Link href="/dashboard" className="hover:text-[#14a800]">Dashboard</Link>
          <span className="mx-2">›</span>
          <span className="text-foreground">Post a Job</span>
        </div>

        {/* Step header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            {STEPS.map((label, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={cn('step-dot', i < step ? 'step-dot-done' : i === step ? 'step-dot-active' : 'step-dot-idle')}>
                  {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className={cn('text-sm hidden sm:block', i === step ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                  {label}
                </span>
                {i < STEPS.length - 1 && <div className="h-px w-12 bg-muted mx-2 hidden sm:block" />}
              </div>
            ))}
          </div>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
          <p className="text-xs text-muted-foreground mt-1">Step {step + 1} of {STEPS.length}</p>
        </div>

        {/* Card */}
        <div className="card p-6 sm:p-8">
          {/* ── Step 0: Job Details ─────────────────────────── */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-foreground mb-1">What work do you need done?</h2>
                <p className="text-sm text-muted-foreground">Write a clear title and description to attract the right freelancers.</p>
              </div>

              <div className="field" ref={titleRef}>
                <label className="label">Job title <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input className="input pr-10" value={form.title} onChange={e => set('title', e.target.value)}
                    placeholder="e.g. Build a React e-commerce website" maxLength={100}
                    onFocus={() => setShowTitleSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowTitleSuggestions(false), 150)} />
                  {form.category && TITLE_SUGGESTIONS[form.category] && (
                    <button type="button" title="Show title suggestions"
                      onClick={() => setShowTitleSuggestions(v => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-[#14a800] transition-colors">
                      <Sparkles className="w-4 h-4" />
                    </button>
                  )}
                  {showTitleSuggestions && form.category && TITLE_SUGGESTIONS[form.category] && (
                    <div className="absolute z-10 mt-1 w-full bg-muted border border-border rounded-xl shadow-lg overflow-hidden top-full">
                      {TITLE_SUGGESTIONS[form.category]
                        .filter(s => !form.title || s.toLowerCase().includes(form.title.toLowerCase()))
                        .map(s => (
                          <button key={s} type="button" onMouseDown={() => { set('title', s); setShowTitleSuggestions(false) }}
                            className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors">
                            {s}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
                <div className="flex justify-between">
                  {errors.title && <p className="field-error">{errors.title}</p>}
                  <span className={cn('text-xs ml-auto', form.title.length > 90 ? 'text-amber-500' : 'text-muted-foreground')}>{form.title.length}/100</span>
                </div>
              </div>

              <div className="field">
                <label className="label">Category <span className="text-red-500">*</span></label>
                <select className="input" value={form.category} onChange={e => set('category', e.target.value)}>
                  <option value="">Select a category…</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {errors.category && <p className="field-error">{errors.category}</p>}
              </div>

              <div className="field">
                <div className="flex items-center justify-between mb-1">
                  <label className="label mb-0">Description <span className="text-red-500">*</span></label>
                  <button type="button" onClick={handleGenerateDescription} disabled={generatingDesc}
                    className="flex items-center gap-1.5 text-xs text-[#14a800] hover:text-[#12c200] disabled:opacity-50 transition-colors font-medium">
                    {generatingDesc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {generatingDesc ? 'Generating…' : 'Generate with AI'}
                  </button>
                </div>
                <textarea className="input" rows={8} value={form.description}
                  onChange={e => set('description', e.target.value)}
                  placeholder="Describe your project in detail: goals, deliverables, tech stack, timeline, and anything else the freelancer should know…"
                  maxLength={3000} />
                <div className="flex justify-between">
                  {errors.description && <p className="field-error">{errors.description}</p>}
                  <span className={cn('text-xs ml-auto', form.description.length > 2800 ? 'text-amber-500' : 'text-muted-foreground')}>{form.description.length}/3000</span>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 1: Requirements ────────────────────────── */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-foreground mb-1">What type of talent do you need?</h2>
                <p className="text-sm text-muted-foreground">Help freelancers understand what skills and experience you&apos;re looking for.</p>
              </div>

              <div className="field">
                <label className="label">Required skills <span className="text-red-500">*</span></label>
                <SkillInput value={form.skills} onChange={v => set('skills', v)} />
                {errors.skills && <p className="field-error">{errors.skills}</p>}
              </div>

              <div className="field">
                <label className="label">Experience level</label>
                <div className="grid grid-cols-3 gap-3">
                  {[['entry','Entry Level','Newer freelancers, lower cost'],['intermediate','Intermediate','Solid experience'],['expert','Expert','High-end & complex']]
                    .map(([val, label, desc]) => (
                    <button key={val} type="button"
                      onClick={() => set('experience_level', val)}
                      className={cn('p-3 rounded-xl border-2 text-left transition-all',
                        form.experience_level === val ? 'border-[#14a800] bg-[#14a800/10]' : 'border-border hover:border-border'
                      )}>
                      <div className={cn('font-semibold text-sm mb-0.5', form.experience_level === val ? 'text-[#14a800]' : 'text-foreground')}>{label}</div>
                      <div className="text-xs text-muted-foreground">{desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <label className="label">Project duration</label>
                <div className="grid grid-cols-2 gap-2">
                  {DURATIONS.map(d => (
                    <button key={d} type="button"
                      onClick={() => set('duration', d)}
                      className={cn('py-2.5 px-3 rounded-full border-2 text-sm font-medium transition-all text-left',
                        form.duration === d ? 'border-[#14a800] bg-[#14a800/20] text-[#14a800]' : 'border-border text-foreground hover:border-border'
                      )}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <label className="label">Payment type</label>
                <div className="grid grid-cols-2 gap-3">
                  {[['fixed','Fixed Price','Pay once for the project'],['hourly','Hourly Rate','Pay by the hour']]
                    .map(([val, label, desc]) => (
                    <button key={val} type="button"
                      onClick={() => set('job_type', val as 'fixed' | 'hourly')}
                      className={cn('p-3 rounded-xl border-2 text-left transition-all',
                        form.job_type === val ? 'border-[#14a800] bg-[#14a800/10]' : 'border-border hover:border-border'
                      )}>
                      <div className={cn('font-semibold text-sm mb-0.5', form.job_type === val ? 'text-[#14a800]' : 'text-foreground')}>{label}</div>
                      <div className="text-xs text-muted-foreground">{desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Budget & Review ─────────────────────── */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-foreground mb-1">What&apos;s your budget?</h2>
                <p className="text-sm text-muted-foreground">Freelancers use this to tailor their proposals to your project.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="field">
                  <label className="label">{form.job_type === 'fixed' ? 'Min budget (₹)' : 'Min hourly rate (₹)'}</label>
                  <input type="number" className="input" value={form.budget_min}
                    onChange={e => set('budget_min', e.target.value)} placeholder="e.g. 5000" min="0" />
                  {errors.budget_min && <p className="field-error">{errors.budget_min}</p>}
                </div>
                <div className="field">
                  <label className="label">{form.job_type === 'fixed' ? 'Max budget (₹)' : 'Max hourly rate (₹)'}</label>
                  <input type="number" className="input" value={form.budget_max}
                    onChange={e => set('budget_max', e.target.value)} placeholder="e.g. 15000" min="0" />
                  {errors.budget_max && <p className="field-error">{errors.budget_max}</p>}
                </div>
              </div>

              {/* Review summary */}
              <div className="bg-card rounded-xl p-4 space-y-3 border border-border">
                <h3 className="font-semibold text-foreground text-sm">Review your job post</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div><span className="text-muted-foreground">Title:</span> <span className="font-medium text-foreground">{form.title}</span></div>
                  <div><span className="text-muted-foreground">Category:</span> <span className="font-medium text-foreground">{form.category}</span></div>
                  <div><span className="text-muted-foreground">Level:</span> <span className="font-medium text-foreground capitalize">{form.experience_level}</span></div>
                  <div><span className="text-muted-foreground">Duration:</span> <span className="font-medium text-foreground">{form.duration}</span></div>
                  <div><span className="text-muted-foreground">Type:</span> <span className="font-medium text-foreground capitalize">{form.job_type}</span></div>
                  <div><span className="text-muted-foreground">Budget:</span> <span className="font-medium text-[#14a800]">₹{form.budget_min}–₹{form.budget_max}</span></div>
                </div>
                {form.skills.length > 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">Skills:</span>
                    <div className="flex flex-wrap gap-1">
                      {form.skills.map(s => <span key={s} className="badge badge-green">{s}</span>)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Nav buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
            {step > 0
              ? <button onClick={back} className="btn btn-secondary flex items-center gap-1"><ChevronLeft className="w-4 h-4" /> Back</button>
              : <div />
            }
            {step < STEPS.length - 1
              ? <button onClick={next} className="btn btn-primary flex items-center gap-1">Continue <ChevronRight className="w-4 h-4" /></button>
              : <button onClick={submit} disabled={isPending} className="btn btn-primary btn-lg flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  {isPending ? 'Posting…' : 'Post Job'}
                </button>
            }
          </div>
        </div>
      </main>
    </div>
  )
}

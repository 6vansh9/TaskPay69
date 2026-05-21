'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ChevronRight, ChevronLeft, Check, Plus } from 'lucide-react'
import toast from 'react-hot-toast'

const INDUSTRIES = [
  'Technology', 'Design & Creative', 'Marketing & Advertising',
  'Finance & Accounting', 'Healthcare', 'Education', 'E-commerce & Retail',
  'Real Estate', 'Legal', 'Manufacturing', 'Media & Entertainment', 'Other',
]

const COMPANY_SIZES = ['Just me', '2–10 employees', '11–50 employees', '50+ employees']

const HIRE_CATEGORIES = [
  'Web Development', 'Mobile Development', 'UI/UX Design', 'Graphic Design',
  'Content Writing', 'Digital Marketing', 'Data Analysis', 'Video & Animation',
  'AI & Machine Learning', 'DevOps & Cloud', 'Cybersecurity', 'Business Consulting',
]

const HIRE_FREQUENCIES = [
  { value: 'one_time', label: 'One time', desc: 'I have a single project in mind' },
  { value: 'occasionally', label: 'Occasionally', desc: 'A few times per year' },
  { value: 'regularly', label: 'Regularly', desc: 'Multiple projects or ongoing work' },
]

const BUDGET_RANGES = [
  'Under ₹10,000', '₹10,000 – ₹50,000', '₹50,000 – ₹2,00,000',
  '₹2,00,000 – ₹10,00,000', 'Over ₹10,00,000', 'Varies by project',
]

export default function ClientOnboarding() {
  const router = useRouter()
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    const fd = new FormData()
    fd.append('avatar', file)
    const res = await fetch('/api/profile/avatar', { method: 'POST', body: fd })
    const data = await res.json()
    setUploadingAvatar(false)
    if (!res.ok) { toast.error(data.error); return }
    setAvatarUrl(data.avatar_url)
    e.target.value = ''
  }

  // Step 1 — Company Info
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [industry, setIndustry] = useState('')
  const [companySize, setCompanySize] = useState('')
  const [location, setLocation] = useState('')
  const [website, setWebsite] = useState('')

  // Step 2 — Hiring Preferences
  const [hireCategories, setHireCategories] = useState<string[]>([])
  const [hireFrequency, setHireFrequency] = useState('')
  const [budgetRange, setBudgetRange] = useState('')

  function toggleCategory(cat: string) {
    setHireCategories(prev =>
      prev.includes(cat)
        ? prev.filter(c => c !== cat)
        : prev.length < 3 ? [...prev, cat] : prev
    )
  }

  function validateStep1() {
    if (!fullName.trim()) { toast.error('Please enter your full name.'); return false }
    if (!industry) { toast.error('Please select your industry.'); return false }
    if (!companySize) { toast.error('Please select your company size.'); return false }
    if (!location.trim()) { toast.error('Please enter your location.'); return false }
    return true
  }

  function validateStep2() {
    if (hireCategories.length === 0) { toast.error('Select at least one hiring category.'); return false }
    if (!hireFrequency) { toast.error('Please select how often you hire.'); return false }
    if (!budgetRange) { toast.error('Please select a typical budget range.'); return false }
    return true
  }

  function next() {
    if (step === 1 && !validateStep1()) return
    setStep(2)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function back() {
    setStep(1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function submit() {
    if (!validateStep2()) return
    setSubmitting(true)

    const body = {
      full_name: fullName.trim(),
      company_name: companyName.trim() || null,
      industry,
      company_size: companySize,
      location: location.trim(),
      website: website.trim() || null,
      hire_categories: hireCategories,
      hire_frequency: hireFrequency,
      budget_range: budgetRange,
    }

    const res = await fetch('/api/onboarding/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    setSubmitting(false)
    if (!res.ok) { toast.error(data.error ?? 'Failed to save.'); return }
    toast.success('Setup complete! Welcome to TaskPay.')
    router.push('/dashboard')
  }

  const steps = ['Company Info', 'Hiring Preferences']

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="text-lg font-bold text-foreground">
            task<span className="text-[#14a800]">pay</span>
          </span>
          <span className="text-sm text-muted-foreground">Step {step} of {steps.length}</span>
        </div>

        {/* Progress bar */}
        <div className="max-w-2xl mx-auto px-4 pb-4">
          <div className="flex gap-2">
            {steps.map((label, i) => (
              <div key={label} className="flex-1">
                <div className={`h-1.5 rounded-full transition-colors ${i + 1 <= step ? 'bg-[#14a800]' : 'bg-muted'}`} />
                <p className={`text-xs mt-1 text-center ${i + 1 === step ? 'text-[#14a800] font-medium' : 'text-[var(--faint)]'}`}>
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* ── Step 1: Company Info ── */}
        {step === 1 && (
          <>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Tell us about yourself</h1>
              <p className="text-muted-foreground mt-1 text-sm">Help freelancers know who they're working with.</p>
            </div>

            <div className="card p-6 space-y-4">
              {/* Profile photo */}
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-2">
                  Profile photo <span className="text-[var(--faint)] font-normal">(optional)</span>
                </label>
                <div className="flex items-center gap-4">
                  <div className="relative flex-shrink-0">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-16 h-16 rounded-full object-cover" />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-[#14a800]/20 flex items-center justify-center text-xl font-bold text-[#14a800]">
                        {fullName ? fullName[0].toUpperCase() : '?'}
                      </div>
                    )}
                    <button type="button" onClick={() => avatarInputRef.current?.click()} disabled={uploadingAvatar}
                      className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#14a800] rounded-full flex items-center justify-center shadow hover:bg-[#0f7a00] transition-colors">
                      {uploadingAvatar ? <Loader2 className="w-3 h-3 text-foreground animate-spin" /> : <Plus className="w-3 h-3 text-foreground" />}
                    </button>
                  </div>
                  <button type="button" onClick={() => avatarInputRef.current?.click()} disabled={uploadingAvatar}
                    className="px-4 py-2 rounded-full border border-border text-sm font-medium text-foreground hover:bg-background transition-colors">
                    {uploadingAvatar ? 'Uploading…' : 'Upload photo'}
                  </button>
                  <span className="text-xs text-[var(--faint)]">JPEG, PNG · Max 5 MB</span>
                </div>
                <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Your Full Name *</label>
                <input className="input w-full" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Priya Sharma" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Company Name <span className="text-[var(--faint)] font-normal">(or leave blank for Individual)</span></label>
                <input className="input w-full" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Acme Corp" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Industry *</label>
                <select className="input w-full" value={industry} onChange={e => setIndustry(e.target.value)}>
                  <option value="">Select your industry…</option>
                  {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-2">Company Size *</label>
                <div className="grid grid-cols-2 gap-2">
                  {COMPANY_SIZES.map(size => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setCompanySize(size)}
                      className={`py-2.5 px-4 rounded-xl border-2 text-sm font-medium text-left transition-all ${companySize === size ? 'border-[#14a800] bg-[#14a800/20] text-[#14a800]' : 'border-border bg-card text-foreground/80 hover:border-border'}`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Location *</label>
                <input className="input w-full" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Mumbai, India" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Website <span className="text-[var(--faint)] font-normal">(optional)</span></label>
                <input className="input w-full" type="url" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://yourcompany.com" />
              </div>
            </div>
          </>
        )}

        {/* ── Step 2: Hiring Preferences ── */}
        {step === 2 && (
          <>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Your hiring preferences</h1>
              <p className="text-muted-foreground mt-1 text-sm">This helps us match you with the right freelancers.</p>
            </div>

            {/* Categories */}
            <div className="card p-6">
              <h2 className="font-semibold text-foreground mb-1">What do you mainly hire for? *</h2>
              <p className="text-sm text-muted-foreground mb-4">Select up to 3 categories.</p>
              <div className="flex flex-wrap gap-2">
                {HIRE_CATEGORIES.map(cat => {
                  const selected = hireCategories.includes(cat)
                  const disabled = !selected && hireCategories.length >= 3
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      disabled={disabled}
                      className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                        selected
                          ? 'bg-[#14a800] text-foreground border-[#14a800]'
                          : disabled
                            ? 'border-border text-[var(--faint)] cursor-not-allowed'
                            : 'border-border text-foreground/80 hover:border-[#14a800] hover:text-[#14a800]'
                      }`}
                    >
                      {selected && <Check className="w-3 h-3 inline mr-1" />}
                      {cat}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-[var(--faint)] mt-3">{hireCategories.length}/3 selected</p>
            </div>

            {/* Frequency */}
            <div className="card p-6">
              <h2 className="font-semibold text-foreground mb-4">How often do you hire? *</h2>
              <div className="space-y-2">
                {HIRE_FREQUENCIES.map(({ value, label, desc }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setHireFrequency(value)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${hireFrequency === value ? 'border-[#14a800] bg-[#14a800/20]' : 'border-border bg-card hover:border-border'}`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${hireFrequency === value ? 'border-[#14a800] bg-[#14a800]' : 'border-border'}`}>
                      {hireFrequency === value && <div className="w-2 h-2 rounded-full bg-card" />}
                    </div>
                    <div>
                      <p className={`font-medium text-sm ${hireFrequency === value ? 'text-[#14a800]' : 'text-foreground'}`}>{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Budget */}
            <div className="card p-6">
              <h2 className="font-semibold text-foreground mb-4">Typical budget per project *</h2>
              <div className="grid grid-cols-2 gap-2">
                {BUDGET_RANGES.map(range => (
                  <button
                    key={range}
                    type="button"
                    onClick={() => setBudgetRange(range)}
                    className={`py-3 px-4 rounded-xl border-2 text-sm font-medium text-left transition-all ${budgetRange === range ? 'border-[#14a800] bg-[#14a800/20] text-[#14a800]' : 'border-border bg-card text-foreground/80 hover:border-border'}`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Navigation */}
        <div className="flex gap-3 pb-8">
          {step > 1 && (
            <button type="button" onClick={back} className="btn btn-secondary">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          )}
          {step === 1 ? (
            <button type="button" onClick={next} className="btn btn-primary flex-1 sm:flex-none sm:px-10">
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button type="button" onClick={submit} disabled={submitting} className="btn btn-primary flex-1 sm:flex-none sm:px-10">
              {submitting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                : <><Check className="w-4 h-4" /> Complete Setup</>}
            </button>
          )}
        </div>

      </main>
    </div>
  )
}

'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import SkillInput from '@/components/jobs/SkillInput'
import toast from 'react-hot-toast'
import { Camera, Plus, Trash2, Save, ArrowLeft, Loader2, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

interface PortfolioItem {
  title: string
  description: string
  url: string
}

interface EducationEntry {
  degree?: string
  institution?: string
  year?: string | number
}

interface Profile {
  id: string
  full_name: string | null
  title: string | null
  bio: string | null
  location: string | null
  hourly_rate: number | null
  skills: string[] | null
  is_available: boolean
  avatar_url: string | null
  portfolio: PortfolioItem[]
  role: string
  company_name: string | null
  industry: string | null
  website: string | null
  experience_years: number | null
  linkedin_url: string | null
  github_url: string | null
  education: EducationEntry | EducationEntry[] | null
}

export default function EditProfilePage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // Freelancer fields
  const [fullName, setFullName]     = useState('')
  const [title, setTitle]           = useState('')
  const [bio, setBio]               = useState('')
  const [location, setLocation]     = useState('')
  const [hourlyRate, setHourlyRate] = useState('')
  const [skills, setSkills]         = useState<string[]>([])
  const [available, setAvailable]   = useState(true)
  const [portfolio, setPortfolio]   = useState<PortfolioItem[]>([])
  const [avatarUrl, setAvatarUrl]   = useState<string | null>(null)
  // Client fields
  const [companyName, setCompanyName] = useState('')
  const [industry, setIndustry]       = useState('')
  const [website, setWebsite]         = useState('')
  // Freelancer extended fields
  const [experienceYears, setExperienceYears] = useState('')
  const [linkedinUrl, setLinkedinUrl]         = useState('')
  const [githubUrl, setGithubUrl]             = useState('')
  const [eduDegree, setEduDegree]             = useState('')
  const [eduInstitution, setEduInstitution]   = useState('')
  const [eduYear, setEduYear]                 = useState('')

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then((p: Profile) => {
        setProfile(p)
        setFullName(p.full_name ?? '')
        setTitle(p.title ?? '')
        setBio(p.bio ?? '')
        setLocation(p.location ?? '')
        setHourlyRate(p.hourly_rate ? String(p.hourly_rate) : '')
        setSkills(p.skills ?? [])
        setAvailable(p.is_available ?? true)
        setPortfolio(Array.isArray(p.portfolio) ? p.portfolio : [])
        setAvatarUrl(p.avatar_url)
        setCompanyName(p.company_name ?? '')
        setIndustry(p.industry ?? '')
        setWebsite(p.website ?? '')
        setExperienceYears(p.experience_years ? String(p.experience_years) : '')
        setLinkedinUrl(p.linkedin_url ?? '')
        setGithubUrl(p.github_url ?? '')
        const edu = p.education
          ? (Array.isArray(p.education) ? p.education[0] : p.education)
          : null
        setEduDegree(edu?.degree ?? '')
        setEduInstitution(edu?.institution ?? '')
        setEduYear(edu?.year ? String(edu.year) : '')
        setLoading(false)
      })
      .catch(() => { toast.error('Failed to load profile'); setLoading(false) })
  }, [])

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    const fd = new FormData()
    fd.append('avatar', file)
    const res = await fetch('/api/profile/avatar', { method: 'POST', body: fd })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error); setUploadingAvatar(false); return }
    setAvatarUrl(data.avatar_url)
    toast.success('Photo updated!')
    setUploadingAvatar(false)
    // reset input so same file can be re-selected
    e.target.value = ''
  }

  async function save() {
    if (!fullName.trim()) { toast.error('Name is required'); return }
    setSaving(true)

    const isFreelancer = profile?.role === 'freelancer'
    const body = isFreelancer
      ? {
          full_name: fullName.trim(),
          title: title.trim(),
          bio: bio.trim(),
          location: location.trim(),
          hourly_rate: hourlyRate ? Number(hourlyRate) : null,
          skills,
          is_available: available,
          portfolio,
          experience_years: experienceYears ? Number(experienceYears) : null,
          linkedin_url: linkedinUrl.trim() || null,
          github_url: githubUrl.trim() || null,
          education: eduDegree.trim() ? [{
            degree: eduDegree.trim(),
            institution: eduInstitution.trim(),
            year: eduYear.trim(),
          }] : null,
        }
      : {
          full_name: fullName.trim(),
          bio: bio.trim(),
          location: location.trim(),
          company_name: companyName.trim(),
          industry: industry.trim(),
          website: website.trim(),
        }

    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { toast.error(data.error); return }
    toast.success('Profile saved!')
    router.push(`/profile/${profile?.id}`)
  }

  const addPortfolioItem = () =>
    setPortfolio(prev => [...prev, { title: '', description: '', url: '' }])

  const updatePortfolio = (i: number, field: keyof PortfolioItem, val: string) =>
    setPortfolio(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: val } : item))

  const removePortfolio = (i: number) =>
    setPortfolio(prev => prev.filter((_, idx) => idx !== i))

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#14a800] mx-auto" />
        </div>
      </div>
    )
  }

  if (!profile) return null
  const isFreelancer = profile.role === 'freelancer'

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {/* Back link */}
        <Link href={`/profile/${profile.id}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-[#14a800] mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to profile
        </Link>

        <h1 className="text-2xl font-bold text-foreground mb-8">Edit Profile</h1>

        <div className="space-y-6">

          {/* Avatar */}
          <div className="card p-6">
            <h2 className="font-semibold text-foreground mb-4">Profile Photo</h2>
            <div className="flex items-center gap-5">
              <div className="relative flex-shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-20 h-20 rounded-full object-cover" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-[#14a800/20] flex items-center justify-center text-3xl font-bold text-[#14a800]">
                    {(fullName || profile.full_name || '?')[0].toUpperCase()}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#14a800] rounded-full flex items-center justify-center shadow-md hover:bg-[#0a6300] transition-colors"
                  aria-label="Change photo"
                >
                  {uploadingAvatar
                    ? <Loader2 className="w-3.5 h-3.5 text-foreground animate-spin" />
                    : <Camera className="w-3.5 h-3.5 text-foreground" />}
                </button>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">JPEG, PNG or WebP · Max 5 MB</p>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="btn btn-secondary btn-sm mt-2"
                >
                  {uploadingAvatar ? 'Uploading…' : 'Choose Photo'}
                </button>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
          </div>

          {/* Basic Info */}
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-foreground">Basic Information</h2>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Full Name *</label>
              <input className="input w-full" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" />
            </div>
            {isFreelancer && (
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Professional Title</label>
                <input className="input w-full" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Full Stack Developer" />
              </div>
            )}
            {!isFreelancer && (
              <>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">Company Name</label>
                  <input className="input w-full" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="e.g. Acme Corp" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">Industry</label>
                  <input className="input w-full" value={industry} onChange={e => setIndustry(e.target.value)} placeholder="e.g. FinTech, HealthTech" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">Website</label>
                  <input className="input w-full" type="url" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://yourcompany.com" />
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Location</label>
              <input className="input w-full" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Bangalore, India" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">
                Bio {isFreelancer ? '(tell clients about your expertise)' : '(tell freelancers about your company)'}
              </label>
              <textarea
                className="input w-full resize-none"
                rows={4}
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder={isFreelancer ? 'Describe your experience, specializations, and what makes you stand out…' : 'Describe your company and the kind of work you hire for…'}
                maxLength={600}
              />
              <p className="text-xs text-[var(--faint)] mt-1">{bio.length}/600</p>
            </div>
          </div>

          {/* Freelancer-only: Rate + Skills + Availability */}
          {isFreelancer && (
            <>
              <div className="card p-6 space-y-4">
                <h2 className="font-semibold text-foreground">Rate & Availability</h2>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">Hourly Rate (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
                    <input
                      className="input w-full pl-7"
                      type="number"
                      min={0}
                      max={100000}
                      value={hourlyRate}
                      onChange={e => setHourlyRate(e.target.value)}
                      placeholder="e.g. 1500"
                    />
                  </div>
                  <p className="text-xs text-[var(--faint)] mt-1">Per hour rate shown on your profile and proposals.</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={available}
                    onClick={() => setAvailable(v => !v)}
                    className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${available ? 'bg-[#14a800]' : 'bg-muted'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-card rounded-full shadow-sm transition-transform ${available ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                  <div>
                    <p className="text-sm font-medium text-foreground">{available ? 'Available for work' : 'Not available'}</p>
                    <p className="text-xs text-muted-foreground">Shown as a green badge on your profile.</p>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <h2 className="font-semibold text-foreground mb-4">Skills</h2>
                <SkillInput value={skills} onChange={setSkills} max={15} />
              </div>

              {/* Experience + LinkedIn + GitHub */}
              <div className="card p-6 space-y-4">
                <h2 className="font-semibold text-foreground">Experience & Links</h2>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">Years of Experience</label>
                  <input
                    className="input w-full"
                    type="number"
                    min={0}
                    max={50}
                    value={experienceYears}
                    onChange={e => setExperienceYears(e.target.value)}
                    placeholder="e.g. 3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">LinkedIn URL</label>
                  <input
                    className="input w-full"
                    type="url"
                    value={linkedinUrl}
                    onChange={e => setLinkedinUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/yourname"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">GitHub URL</label>
                  <input
                    className="input w-full"
                    type="url"
                    value={githubUrl}
                    onChange={e => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/yourname"
                  />
                </div>
              </div>

              {/* Education */}
              <div className="card p-6 space-y-4">
                <h2 className="font-semibold text-foreground">Education</h2>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">Degree / Qualification</label>
                  <input
                    className="input w-full"
                    value={eduDegree}
                    onChange={e => setEduDegree(e.target.value)}
                    placeholder="e.g. B.Tech Computer Science"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-1">Institution</label>
                    <input
                      className="input w-full"
                      value={eduInstitution}
                      onChange={e => setEduInstitution(e.target.value)}
                      placeholder="e.g. IIT Delhi"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-1">Year</label>
                    <input
                      className="input w-full"
                      type="number"
                      min={1990}
                      max={2030}
                      value={eduYear}
                      onChange={e => setEduYear(e.target.value)}
                      placeholder="e.g. 2024"
                    />
                  </div>
                </div>
              </div>

              {/* Portfolio */}
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-foreground">Portfolio</h2>
                  <button
                    type="button"
                    onClick={addPortfolioItem}
                    disabled={portfolio.length >= 10}
                    className="btn btn-secondary btn-sm"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Item
                  </button>
                </div>
                {portfolio.length === 0 && (
                  <p className="text-sm text-[var(--faint)] text-center py-4">
                    No portfolio items yet. Add links to your best work.
                  </p>
                )}
                <div className="space-y-4">
                  {portfolio.map((item, i) => (
                    <div key={i} className="border border-border rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Item {i + 1}</span>
                        <button type="button" onClick={() => removePortfolio(i)} className="text-red-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <input
                        className="input w-full"
                        placeholder="Project title"
                        value={item.title}
                        onChange={e => updatePortfolio(i, 'title', e.target.value)}
                      />
                      <textarea
                        className="input w-full resize-none"
                        rows={2}
                        placeholder="Brief description of what you built or accomplished"
                        value={item.description}
                        onChange={e => updatePortfolio(i, 'description', e.target.value)}
                      />
                      <input
                        className="input w-full"
                        type="url"
                        placeholder="https://github.com/you/project or live URL"
                        value={item.url}
                        onChange={e => updatePortfolio(i, 'url', e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Save */}
          <div className="flex gap-3 pb-8">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="btn btn-primary flex-1 sm:flex-none sm:px-10"
            >
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save Changes</>}
            </button>
            <Link href={`/profile/${profile.id}`} className="btn btn-secondary">
              Cancel
            </Link>
          </div>

          {/* Danger Zone — link to Settings */}
          <div className="card border-red-900/50 p-6 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="font-semibold text-red-400 mb-0.5 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Danger Zone
              </h2>
              <p className="text-sm text-muted-foreground">
                Account deletion and other sensitive actions are managed in Settings.
              </p>
            </div>
            <Link
              href="/settings"
              className="btn btn-sm border border-red-800/50 text-red-600 hover:bg-red-950/30 bg-card self-start sm:self-center flex-shrink-0"
            >
              Go to Settings
            </Link>
          </div>

        </div>
      </main>
    </div>
  )
}

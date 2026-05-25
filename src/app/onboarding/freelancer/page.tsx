'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Loader2, X, Plus, Trash2, Check, ExternalLink, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'

type Level = 'beginner' | 'intermediate' | 'expert'
type ExperienceLevel = 'new' | 'some' | 'expert' | ''

interface SkillWithLevel {
  skill: string
  level: Level
}

interface PortfolioItem {
  title: string
  description: string
  url: string
  image_url: string
  uploading: boolean
}

const SKILL_SUGGESTIONS = [
  'React', 'Next.js', 'TypeScript', 'Node.js', 'Python', 'Django', 'FastAPI',
  'PostgreSQL', 'MongoDB', 'Redis', 'Tailwind CSS', 'Figma', 'React Native',
  'Flutter', 'iOS', 'Android', 'AWS', 'Docker', 'GraphQL', 'REST API', 'UI/UX',
  'Copywriting', 'SEO', 'WordPress', 'Shopify', 'Data Analysis', 'Machine Learning',
  'Vue.js', 'Angular', 'PHP', 'Laravel', 'Ruby on Rails', 'Java', 'Spring Boot',
]

const EXP_CARDS = [
  {
    value: 'new' as const,
    years: '0',
    label: 'I am brand new to this',
    emoji: '🔍',
  },
  {
    value: 'some' as const,
    years: '2',
    label: 'I have some experience',
    emoji: '✏️',
  },
  {
    value: 'expert' as const,
    years: '7',
    label: 'I am an expert',
    emoji: '💼',
  },
]

const ROLE_SUGGESTIONS = [
  'Full Stack Developer', 'Frontend Developer', 'Backend Developer', 'React Developer',
  'Next.js Developer', 'Node.js Developer', 'Python Developer', 'Java Developer',
  'UI/UX Designer', 'Product Designer', 'Graphic Designer', 'Motion Designer',
  'Mobile App Developer', 'React Native Developer', 'Flutter Developer', 'iOS Developer', 'Android Developer',
  'Data Scientist', 'Machine Learning Engineer', 'Data Analyst', 'AI/ML Engineer',
  'Content Writer', 'Technical Writer', 'Copywriter', 'SEO Specialist',
  'Digital Marketer', 'Social Media Manager', 'Growth Hacker', 'Performance Marketer',
  'Video Editor', 'DevOps Engineer', 'Cloud Architect', 'Blockchain Developer',
]

const INDIAN_CITIES = [
  'Mumbai, Maharashtra', 'Delhi, Delhi', 'Bangalore, Karnataka', 'Hyderabad, Telangana',
  'Ahmedabad, Gujarat', 'Chennai, Tamil Nadu', 'Kolkata, West Bengal', 'Surat, Gujarat',
  'Pune, Maharashtra', 'Jaipur, Rajasthan', 'Lucknow, Uttar Pradesh', 'Kanpur, Uttar Pradesh',
  'Nagpur, Maharashtra', 'Indore, Madhya Pradesh', 'Thane, Maharashtra', 'Bhopal, Madhya Pradesh',
  'Visakhapatnam, Andhra Pradesh', 'Pimpri-Chinchwad, Maharashtra', 'Patna, Bihar', 'Vadodara, Gujarat',
  'Ghaziabad, Uttar Pradesh', 'Ludhiana, Punjab', 'Agra, Uttar Pradesh', 'Nashik, Maharashtra',
  'Faridabad, Haryana', 'Meerut, Uttar Pradesh', 'Rajkot, Gujarat', 'Kalyan-Dombivali, Maharashtra',
  'Vasai-Virar, Maharashtra', 'Varanasi, Uttar Pradesh', 'Srinagar, Jammu & Kashmir',
  'Aurangabad, Maharashtra', 'Dhanbad, Jharkhand', 'Amritsar, Punjab', 'Navi Mumbai, Maharashtra',
  'Allahabad, Uttar Pradesh', 'Ranchi, Jharkhand', 'Howrah, West Bengal', 'Coimbatore, Tamil Nadu',
  'Jabalpur, Madhya Pradesh', 'Gwalior, Madhya Pradesh', 'Vijayawada, Andhra Pradesh', 'Jodhpur, Rajasthan',
  'Madurai, Tamil Nadu', 'Raipur, Chhattisgarh', 'Kota, Rajasthan', 'Chandigarh, Punjab',
  'Guwahati, Assam', 'Solapur, Maharashtra', 'Hubli-Dharwad, Karnataka', 'Bareilly, Uttar Pradesh',
  'Mysore, Karnataka', 'Tiruchirappalli, Tamil Nadu', 'Thiruvananthapuram, Kerala', 'Kochi, Kerala',
  'Noida, Uttar Pradesh', 'Gurugram, Haryana', 'Remote',
]

const DEGREES = ['B.Tech / B.E.', 'B.Sc', 'BCA', 'BBA', 'B.Com', 'B.A.', 'MBA', 'M.Tech / M.E.', 'M.Sc', 'MCA', 'M.A.', 'M.Com', 'PhD', 'Diploma', 'Other']

const BRANCHES_BY_DEGREE: Record<string, string[]> = {
  'B.Tech / B.E.': ['Computer Science (CSE)', 'Information Technology (IT)', 'Electronics & Communication (ECE)', 'Electrical Engineering (EE)', 'Mechanical Engineering', 'Civil Engineering', 'Chemical Engineering', 'Aerospace Engineering', 'Biotechnology', 'Other'],
  'M.Tech / M.E.': ['Computer Science (CSE)', 'Information Technology (IT)', 'Electronics & Communication (ECE)', 'Electrical Engineering (EE)', 'Mechanical Engineering', 'Data Science & AI', 'VLSI Design', 'Other'],
  'B.Sc': ['Computer Science', 'Information Technology', 'Physics', 'Mathematics', 'Statistics', 'Chemistry', 'Biology', 'Other'],
  'M.Sc': ['Computer Science', 'Information Technology', 'Physics', 'Mathematics', 'Statistics', 'Data Science', 'Other'],
  'BCA': ['Computer Applications'],
  'MCA': ['Computer Applications'],
  'BBA': ['General Management', 'Marketing', 'Finance', 'HR', 'International Business', 'Other'],
  'MBA': ['General Management', 'Marketing', 'Finance', 'HR', 'Operations', 'Analytics', 'International Business', 'Other'],
  'B.Com': ['General', 'Accounting', 'Finance', 'Other'],
  'M.Com': ['General', 'Accounting', 'Finance', 'Other'],
  'B.A.': ['Economics', 'English', 'Political Science', 'Psychology', 'Sociology', 'History', 'Other'],
  'M.A.': ['Economics', 'English', 'Political Science', 'Psychology', 'Sociology', 'Other'],
  'PhD': ['Computer Science', 'Engineering', 'Science', 'Humanities', 'Management', 'Other'],
  'Diploma': ['Computer Science', 'Electronics', 'Mechanical', 'Civil', 'Other'],
  'Other': ['Other'],
}

const INSTITUTIONS = [
  'IIT Bombay', 'IIT Delhi', 'IIT Kanpur', 'IIT Madras', 'IIT Kharagpur', 'IIT Roorkee', 'IIT Guwahati',
  'NIT Trichy', 'NIT Warangal', 'NIT Surathkal', 'NIT Calicut', 'NIT Rourkela',
  'BITS Pilani', 'BITS Goa', 'BITS Hyderabad',
  'Delhi University', 'Mumbai University', 'Pune University', 'Osmania University',
  'Anna University', 'VTU Belgaum', 'JNTU Hyderabad', 'Amity University',
  'Manipal University', 'SRM University', 'Vellore Institute of Technology (VIT)', 'Symbiosis International University',
  'Lovely Professional University (LPU)', 'Chandigarh University', 'Sharda University',
  'IIM Ahmedabad', 'IIM Bangalore', 'IIM Calcutta', 'IIM Lucknow', 'ISB Hyderabad',
  'Other',
]

const PLATFORM_FEE_RATE = 0.10

export default function FreelancerOnboarding() {
  const router = useRouter()
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const portfolioInputRefs = useRef<(HTMLInputElement | null)[]>([])

  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  // Step 1 — Basic Info
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [fullName, setFullName] = useState('')
  const [tagline, setTagline] = useState('')
  const [bio, setBio] = useState('')
  const [locations, setLocations] = useState<string[]>([])
  const [locationInput, setLocationInput] = useState('')
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false)
  const [showRoleSuggestions, setShowRoleSuggestions] = useState(false)
  const [generatingBio, setGeneratingBio] = useState(false)

  // Step 2 — Skills & Rates
  const [skillInput, setSkillInput] = useState('')
  const [skillFocused, setSkillFocused] = useState(false)
  const [skillsWithLevel, setSkillsWithLevel] = useState<SkillWithLevel[]>([])
  const [hourlyRate, setHourlyRate] = useState('')
  const [experienceYears, setExperienceYears] = useState('')
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('')

  // Step 3 — Portfolio
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([])
  const [educationDegree, setEducationDegree] = useState('')
  const [educationBranch, setEducationBranch] = useState('')
  const [educationInstitution, setEducationInstitution] = useState('')
  const [eduInstInput, setEduInstInput] = useState('')
  const [showEduInstSuggestions, setShowEduInstSuggestions] = useState(false)
  const [educationYear, setEducationYear] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [githubUrl, setGithubUrl] = useState('')

  // ── Helpers ───────────────────────────────────────────────────

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

  const suggestedSkills = SKILL_SUGGESTIONS.filter(
    s => !skillsWithLevel.find(sl => sl.skill === s)
  ).slice(0, 8)

  const filteredSuggestions = skillInput.length > 0
    ? SKILL_SUGGESTIONS.filter(s =>
        s.toLowerCase().includes(skillInput.toLowerCase()) &&
        !skillsWithLevel.find(sl => sl.skill === s)
      )
    : []

  function addSkill(skill: string) {
    const trimmed = skill.trim()
    if (!trimmed || skillsWithLevel.find(sl => sl.skill === trimmed) || skillsWithLevel.length >= 10) return
    setSkillsWithLevel(prev => [...prev, { skill: trimmed, level: 'intermediate' }])
    setSkillInput('')
  }

  function removeSkill(skill: string) {
    setSkillsWithLevel(prev => prev.filter(sl => sl.skill !== skill))
  }

  function onSkillKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if ((e.key === 'Enter' || e.key === ',') && skillInput.trim()) {
      e.preventDefault()
      addSkill(skillInput)
    }
    if (e.key === 'Backspace' && !skillInput && skillsWithLevel.length > 0) {
      removeSkill(skillsWithLevel[skillsWithLevel.length - 1].skill)
    }
  }

  async function handleGenerateBio() {
    if (!fullName && !tagline) { toast.error('Add your name and role first'); return }
    setGeneratingBio(true)
    const res = await fetch('/api/ai/generate-bio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: fullName, role: tagline, skills: skillsWithLevel.map(s => s.skill) }),
    })
    const data = await res.json()
    setGeneratingBio(false)
    if (!res.ok) { toast.error(data.error ?? 'Failed to generate bio'); return }
    setBio(data.bio)
    toast.success('Bio generated!')
  }

  function selectExperienceLevel(val: ExperienceLevel) {
    setExperienceLevel(val)
    const card = EXP_CARDS.find(c => c.value === val)
    if (card) setExperienceYears(card.years)
  }

  function addPortfolioItem() {
    if (portfolio.length >= 3) return
    setPortfolio(prev => [...prev, { title: '', description: '', url: '', image_url: '', uploading: false }])
  }

  function updatePortfolio(i: number, field: keyof Omit<PortfolioItem, 'uploading'>, val: string) {
    setPortfolio(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: val } : item))
  }

  function removePortfolioItem(i: number) {
    setPortfolio(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handlePortfolioImage(i: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPortfolio(prev => prev.map((item, idx) => idx === i ? { ...item, uploading: true } : item))
    const fd = new FormData()
    fd.append('image', file)
    const res = await fetch('/api/upload/portfolio-image', { method: 'POST', body: fd })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error)
      setPortfolio(prev => prev.map((item, idx) => idx === i ? { ...item, uploading: false } : item))
      return
    }
    setPortfolio(prev => prev.map((item, idx) => idx === i ? { ...item, image_url: data.url, uploading: false } : item))
    e.target.value = ''
  }

  // ── Validation ────────────────────────────────────────────────

  function validateStep1() {
    if (!fullName.trim()) { toast.error('Please enter your full name.'); return false }
    if (!tagline.trim()) { toast.error('Please add a professional title.'); return false }
    if (bio.trim().length < 100) { toast.error(`Bio must be at least 100 characters (${bio.trim().length}/100).`); return false }
    if (locations.length === 0 && !locationInput.trim()) { toast.error('Please add at least one location.'); return false }
    return true
  }

  function validateStep2() {
    if (skillsWithLevel.length === 0) { toast.error('Add at least one skill.'); return false }
    if (!hourlyRate || isNaN(Number(hourlyRate)) || Number(hourlyRate) <= 0) {
      toast.error('Please enter a valid hourly rate.')
      return false
    }
    return true
  }

  function next() {
    if (step === 1 && !validateStep1()) return
    if (step === 2 && !validateStep2()) return
    setStep(s => s + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function back() {
    setStep(s => s - 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function submit() {
    setSubmitting(true)
    const allLocations = [...locations]
    if (locationInput.trim() && !allLocations.includes(locationInput.trim())) allLocations.push(locationInput.trim())
    const body = {
      full_name: fullName.trim(),
      title: tagline.trim(),
      bio: bio.trim(),
      location: allLocations.join(', '),
      hourly_rate: Number(hourlyRate),
      experience_years: experienceYears ? Number(experienceYears) : null,
      skills: skillsWithLevel.map(sl => sl.skill),
      skills_with_level: skillsWithLevel,
      portfolio: portfolio.map(({ uploading: _, ...p }) => p),
      education: educationDegree ? {
        degree: educationDegree,
        branch: educationBranch || null,
        institution: educationInstitution || null,
        year: educationYear || null,
      } : null,
      linkedin_url: linkedinUrl.trim() || null,
      github_url: githubUrl.trim() || null,
    }

    const res = await fetch('/api/onboarding/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    setSubmitting(false)
    if (!res.ok) { toast.error(data.error ?? 'Failed to save.'); return }
    toast.success('Profile complete! Welcome to TaskPay.')
    router.push('/dashboard')
  }

  // ── Fee calc ──────────────────────────────────────────────────
  const rateNum = Number(hourlyRate) || 0
  const platformFee = Math.round(rateNum * PLATFORM_FEE_RATE)
  const youGet = rateNum - platformFee

  // ── Shared input style ────────────────────────────────────────
  const inputCls = 'w-full border border-border rounded-lg px-3.5 py-2.5 text-sm text-foreground placeholder:text-[var(--faint)] focus:border-[#14a800] focus:outline-none focus:ring-2 focus:ring-[#14a800]/10 transition-colors bg-card'

  const NEXT_LABELS = ['Next, add your skills', 'Next, add your portfolio', 'Submit profile']
  const STEP_HEADINGS = [
    'Tell clients about yourself',
    'What work are you here to do?',
    'Almost done, a few final details',
  ]
  const STEP_SUBS = [
    "It's the first thing clients see, so make a great impression.",
    "Your skills and rate help clients find and hire you.",
    "Add your portfolio, education, and links to stand out.",
  ]

  return (
    <div className="min-h-screen bg-card flex flex-col">

      {/* ── Logo Header ─────────────────────────────────────────── */}
      <header className="flex-shrink-0 border-b border-border px-6 py-4">
        <div className="max-w-[700px] mx-auto flex items-center justify-between">
          <span className="text-xl font-bold tracking-tight font-sans text-foreground">
            task<span className="text-[#14a800]">pay</span>
          </span>
          <span className="text-sm text-[var(--faint)]">Freelancer profile</span>
        </div>
      </header>

      {/* ── Thin progress bar ───────────────────────────────────── */}
      <div className="h-[3px] bg-muted flex-shrink-0">
        <div
          className="h-full bg-[#14a800] transition-all duration-500 ease-out"
          style={{ width: `${(step / 3) * 100}%` }}
        />
      </div>

      {/* ── Main content ────────────────────────────────────────── */}
      <main className="flex-1 max-w-[700px] mx-auto w-full px-4 sm:px-6 pt-8 pb-28">

        {/* Step counter */}
        <p className="text-sm font-medium text-[var(--faint)] mb-5">{step}/3</p>

        {/* Step heading */}
        <h1 className="text-[2rem] font-bold text-foreground leading-tight mb-2">
          {STEP_HEADINGS[step - 1]}
        </h1>
        <p className="text-base text-muted-foreground mb-8">{STEP_SUBS[step - 1]}</p>

        {/* ════════════════════════════════════════════════════════
            STEP 1 — Basic Info
        ════════════════════════════════════════════════════════ */}
        {step === 1 && (
          <div className="space-y-8">

            {/* Profile photo */}
            <div>
              <p className="text-sm font-semibold text-foreground mb-3">
                Profile photo <span className="text-[var(--faint)] font-normal">(optional)</span>
              </p>
              <div className="flex items-center gap-4">
                <div className="relative flex-shrink-0">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-[72px] h-[72px] rounded-full object-cover" />
                  ) : (
                    <div className="w-[72px] h-[72px] rounded-full bg-[#14a800/20] flex items-center justify-center text-2xl font-bold text-[#14a800]">
                      {fullName ? fullName[0].toUpperCase() : '?'}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#14a800] rounded-full flex items-center justify-center shadow hover:bg-[#0f7a00] transition-colors"
                  >
                    {uploadingAvatar
                      ? <Loader2 className="w-3.5 h-3.5 text-foreground animate-spin" />
                      : <Plus className="w-3.5 h-3.5 text-foreground" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="px-4 py-2 rounded-full border border-border text-sm font-medium text-foreground hover:bg-background transition-colors"
                >
                  {uploadingAvatar ? 'Uploading…' : 'Upload photo'}
                </button>
                <span className="text-xs text-[var(--faint)]">JPEG, PNG · Max 5 MB</span>
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            <hr className="border-border" />

            {/* Full name */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Full name <span className="text-red-500">*</span>
              </label>
              <input
                className={inputCls}
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="e.g. Arjun Mehta"
              />
            </div>

            {/* Professional title */}
            <div className="relative">
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Your professional role <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-[var(--faint)] mb-2">
                It&apos;s the very first thing clients see. Describe your expertise in your own words.
              </p>
              <div className="relative">
                <input
                  className={inputCls}
                  value={tagline}
                  onChange={e => { setTagline(e.target.value); setShowRoleSuggestions(true) }}
                  placeholder="e.g. Full Stack Developer | React & Node.js"
                  maxLength={100}
                  onFocus={() => setShowRoleSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowRoleSuggestions(false), 150)}
                />
                <button
                  type="button"
                  onClick={() => setShowRoleSuggestions(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-[#14a800] hover:bg-[#14a800]/10 transition-colors"
                  title="Suggestions"
                >
                  <Sparkles className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-[var(--faint)] mt-1 text-right">{tagline.length}/100</p>
              {showRoleSuggestions && (() => {
                const filtered = ROLE_SUGGESTIONS.filter(r =>
                  !tagline || r.toLowerCase().includes(tagline.toLowerCase())
                )
                return filtered.length > 0 ? (
                  <div className="absolute left-0 right-0 z-20 mt-1 bg-muted border border-border rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto">
                    {filtered.map(r => (
                      <button
                        key={r}
                        type="button"
                        onMouseDown={() => { setTagline(r); setShowRoleSuggestions(false) }}
                        className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-white/5 transition-colors"
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                ) : null
              })()}
            </div>

            {/* Location */}
            <div className="relative">
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Location <span className="text-red-500">*</span>
                <span className="text-[var(--faint)] font-normal text-xs ml-1">(up to 3)</span>
              </label>
              {locations.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {locations.map(loc => (
                    <span key={loc} className="flex items-center gap-1.5 px-3 py-1 bg-muted text-foreground text-xs font-medium rounded-full border border-border">
                      {loc}
                      <button type="button" onClick={() => setLocations(ls => ls.filter(l => l !== loc))} className="hover:text-red-400 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {locations.length < 3 && (
                <div className="relative">
                  <input
                    className={inputCls}
                    value={locationInput}
                    onChange={e => { setLocationInput(e.target.value); setShowLocationSuggestions(true) }}
                    onFocus={() => setShowLocationSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 150)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && locationInput.trim()) {
                        e.preventDefault()
                        if (!locations.includes(locationInput.trim())) setLocations(ls => [...ls, locationInput.trim()])
                        setLocationInput('')
                        setShowLocationSuggestions(false)
                      }
                    }}
                    placeholder={locations.length === 0 ? 'e.g. Bangalore, Karnataka' : 'Add another location…'}
                  />
                  {showLocationSuggestions && locationInput.trim() && (() => {
                    const filtered = INDIAN_CITIES.filter(c =>
                      c.toLowerCase().includes(locationInput.toLowerCase()) && !locations.includes(c)
                    ).slice(0, 6)
                    return filtered.length > 0 ? (
                      <div className="absolute left-0 right-0 z-20 mt-1 bg-muted border border-border rounded-xl shadow-xl overflow-hidden top-full">
                        {filtered.map(c => (
                          <button key={c} type="button"
                            onMouseDown={() => { setLocations(ls => [...ls, c]); setLocationInput(''); setShowLocationSuggestions(false) }}
                            className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-white/5 transition-colors">
                            {c}
                          </button>
                        ))}
                      </div>
                    ) : null
                  })()}
                </div>
              )}
              <p className="text-xs text-[var(--faint)] mt-1">Press Enter to add a location</p>
            </div>

            <hr className="border-border" />

            {/* Bio — two-column with tip on desktop */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Write a bio to tell clients about yourself <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-[var(--faint)] mb-3">
                Help clients get to know you at a glance. What do you do best?
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">
                {/* Textarea */}
                <div className="lg:col-span-3">
                  <textarea
                    className={`${inputCls} resize-none leading-relaxed`}
                    rows={7}
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    placeholder="I am a motivated developer with hands-on experience in full-stack development…"
                    maxLength={600}
                  />
                  <div className="flex items-center justify-between mt-1.5">
                    <span className={`text-xs font-medium ${bio.trim().length < 100 ? 'text-amber-500' : 'text-[#14a800]'}`}>
                      {bio.trim().length < 100
                        ? `${bio.trim().length}/100 minimum, keep going!`
                        : `✓ ${bio.trim().length} characters`}
                    </span>
                    <span className="text-xs text-[var(--faint)]">{bio.length}/600</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateBio}
                    disabled={generatingBio}
                    className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[#14a800] hover:text-[#10cc00] transition-colors disabled:opacity-50"
                  >
                    {generatingBio
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</>
                      : <><Sparkles className="w-3.5 h-3.5" /> Generate with AI</>}
                  </button>
                </div>

                {/* Tip card */}
                <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-9 h-9 rounded-full bg-[#14a800/20] flex items-center justify-center text-sm font-bold text-[#14a800] flex-shrink-0">
                      R
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Reena S.</p>
                      <p className="text-xs text-[var(--faint)]">⭐ 4.9 · ₹2,200/hr · 22 jobs</p>
                    </div>
                  </div>
                  <p className="text-[13px] text-foreground leading-relaxed italic">
                    &quot;Your TaskPay profile is how you stand out from the crowd. It&apos;s what you use to win work, so let&apos;s make it a good one.&quot;
                  </p>
                  <p className="text-[11px] text-[var(--faint)] mt-2 font-medium">TaskPay Pro Tip</p>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            STEP 2 — Skills & Rates
        ════════════════════════════════════════════════════════ */}
        {step === 2 && (
          <div className="space-y-10">

            {/* Experience level */}
            <div>
              <p className="text-base font-semibold text-foreground mb-1">
                First, have you freelanced before?
              </p>
              <p className="text-sm text-[var(--faint)] mb-4">
                This lets us know how much help to give you along the way. We won&apos;t share this with clients.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {EXP_CARDS.map(card => {
                  const selected = experienceLevel === card.value
                  return (
                    <button
                      key={card.value}
                      type="button"
                      onClick={() => selectExperienceLevel(card.value)}
                      className={`relative flex flex-col items-start text-left p-5 rounded-2xl border-2 transition-all ${
                        selected
                          ? 'border-[#14a800] bg-[#14a800/10]'
                          : 'border-border bg-card hover:border-border'
                      }`}
                    >
                      {/* Radio indicator */}
                      <span className={`absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selected ? 'border-[#14a800] bg-[#14a800]' : 'border-border bg-card'
                      }`}>
                        {selected && <span className="w-2 h-2 rounded-full bg-card" />}
                      </span>
                      <span className="text-3xl mb-3">{card.emoji}</span>
                      <span className="text-sm font-semibold text-foreground leading-snug">{card.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <hr className="border-border" />

            {/* Skills */}
            <div>
              <p className="text-base font-semibold text-foreground mb-1">Your skills</p>
              <p className="text-sm text-[var(--faint)] mb-4">
                Your skills show clients what you can offer. Add or remove the ones that best describe you. Max 10 skills.
              </p>

              {/* Combined chip + input box */}
              <div
                className={`min-h-[52px] flex flex-wrap items-center gap-2 border rounded-lg px-3 py-2.5 cursor-text transition-colors ${
                  skillFocused ? 'border-[#14a800] ring-2 ring-[#14a800]/10' : 'border-border'
                }`}
                onClick={() => document.getElementById('skill-input')?.focus()}
              >
                {skillsWithLevel.map(({ skill }) => (
                  <span
                    key={skill}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-muted text-foreground text-xs font-medium rounded-full flex-shrink-0"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); removeSkill(skill) }}
                      className="hover:text-red-300 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {skillsWithLevel.length < 10 && (
                  <div className="relative flex-1 min-w-[140px]">
                    <input
                      id="skill-input"
                      value={skillInput}
                      onChange={e => setSkillInput(e.target.value)}
                      onKeyDown={onSkillKeyDown}
                      onFocus={() => setSkillFocused(true)}
                      onBlur={() => setTimeout(() => setSkillFocused(false), 150)}
                      placeholder={skillsWithLevel.length === 0 ? 'Enter skills here' : ''}
                      className="w-full bg-transparent text-sm text-foreground placeholder:text-[var(--faint)] outline-none"
                    />
                    {skillFocused && filteredSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-20 overflow-hidden">
                        {filteredSuggestions.slice(0, 6).map(s => (
                          <button
                            key={s}
                            type="button"
                            onMouseDown={() => addSkill(s)}
                            className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-background transition-colors"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs text-[var(--faint)] mt-1.5">{skillsWithLevel.length}/10 skills added</p>

              {/* Suggested skills */}
              {suggestedSkills.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Suggested skills</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedSkills.map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => addSkill(s)}
                        disabled={skillsWithLevel.length >= 10}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-border text-sm text-foreground hover:border-[#14a800] hover:text-[#14a800] transition-colors disabled:opacity-40"
                      >
                        <Plus className="w-3 h-3" />
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <hr className="border-border" />

            {/* Hourly rate with fee breakdown */}
            <div>
              <p className="text-base font-semibold text-foreground mb-1">Now, let&apos;s set your hourly rate</p>
              <p className="text-sm text-[var(--faint)] mb-6">
                Clients will see this rate on your profile. You can adjust it every time you send a proposal.
              </p>

              {/* Rate input row */}
              <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
                {/* Hourly rate row */}
                <div className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Hourly rate</p>
                    <p className="text-xs text-[var(--faint)] mt-0.5">Total amount the client will see.</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-sm font-semibold text-foreground">₹</span>
                    <input
                      type="number"
                      min={0}
                      max={100000}
                      value={hourlyRate}
                      onChange={e => setHourlyRate(e.target.value)}
                      placeholder="1500"
                      className="w-24 border border-border rounded-lg px-3 py-1.5 text-sm text-right font-semibold text-foreground focus:border-[#14a800] focus:outline-none transition-colors"
                    />
                    <span className="text-sm text-muted-foreground">/hr</span>
                  </div>
                </div>

                {/* Platform fee row */}
                <div className="flex items-center justify-between px-5 py-4 bg-card">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Platform fee (10%)</p>
                    <p className="text-xs text-[var(--faint)] mt-0.5">Helps us run TaskPay and provide payment protection.</p>
                  </div>
                  <span className="text-sm font-semibold text-muted-foreground flex-shrink-0">
                    {rateNum > 0 ? `- ₹${platformFee.toLocaleString()}` : '—'} /hr
                  </span>
                </div>

                {/* You'll get row */}
                <div className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">You&apos;ll get</p>
                    <p className="text-xs text-[var(--faint)] mt-0.5">Estimated amount you&apos;ll receive after fees.</p>
                  </div>
                  <span className="text-base font-bold text-[#14a800] flex-shrink-0">
                    {rateNum > 0 ? `₹${youGet.toLocaleString()}` : '—'} /hr
                  </span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            STEP 3 — Portfolio / Education / Links
        ════════════════════════════════════════════════════════ */}
        {step === 3 && (
          <div className="space-y-10">

            {/* Portfolio */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-base font-semibold text-foreground">
                  Portfolio <span className="text-[var(--faint)] font-normal text-sm">(optional, up to 3)</span>
                </p>
                {portfolio.length < 3 && (
                  <button
                    type="button"
                    onClick={addPortfolioItem}
                    className="flex items-center gap-1.5 text-sm text-[#14a800] font-medium hover:text-[#0f7a00] transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add project
                  </button>
                )}
              </div>
              <p className="text-sm text-[var(--faint)] mb-4">
                Showcase your best work. Freelancers with portfolios are hired 9× more often.
              </p>

              {portfolio.length === 0 ? (
                <button
                  type="button"
                  onClick={addPortfolioItem}
                  className="w-full py-8 rounded-2xl border-2 border-dashed border-border flex flex-col items-center gap-2 text-[var(--faint)] hover:border-[#14a800] hover:text-[#14a800] transition-colors"
                >
                  <Plus className="w-6 h-6" />
                  <span className="text-sm font-medium">Add a project</span>
                </button>
              ) : (
                <div className="space-y-4">
                  {portfolio.map((item, i) => (
                    <div key={i} className="border border-border rounded-2xl p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--faint)] uppercase tracking-widest">
                          Project {i + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removePortfolioItem(i)}
                          className="text-[var(--faint)] hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Image upload */}
                      {item.image_url ? (
                        <div className="relative">
                          <img src={item.image_url} alt="" className="w-full h-36 object-cover rounded-xl" />
                          <button
                            type="button"
                            onClick={() => updatePortfolio(i, 'image_url', '')}
                            className="absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center text-foreground hover:bg-black/70"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => portfolioInputRefs.current[i]?.click()}
                          disabled={item.uploading}
                          className="w-full h-28 rounded-xl border-2 border-dashed border-border flex items-center justify-center gap-2 text-sm text-[var(--faint)] hover:border-[#14a800] hover:text-[#14a800] transition-colors"
                        >
                          {item.uploading
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
                            : <><Camera className="w-4 h-4" /> Upload image (optional)</>}
                        </button>
                      )}
                      <input
                        ref={el => { portfolioInputRefs.current[i] = el }}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={e => handlePortfolioImage(i, e)}
                      />

                      <input
                        className={inputCls}
                        placeholder="Project title"
                        value={item.title}
                        onChange={e => updatePortfolio(i, 'title', e.target.value)}
                      />
                      <textarea
                        className={`${inputCls} resize-none`}
                        rows={2}
                        placeholder="What did you build? What was the impact?"
                        value={item.description}
                        onChange={e => updatePortfolio(i, 'description', e.target.value)}
                      />
                      <input
                        className={inputCls}
                        placeholder="Project URL (optional)"
                        value={item.url}
                        onChange={e => updatePortfolio(i, 'url', e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <hr className="border-border" />

            {/* Education */}
            <div>
              <p className="text-base font-semibold text-foreground mb-1">
                Education <span className="text-[var(--faint)] font-normal text-sm">(optional)</span>
              </p>
              <p className="text-sm text-[var(--faint)] mb-4">
                Freelancers who include their education are seen three times more.
              </p>
              <div className="space-y-3">
                <select className={inputCls} value={educationDegree}
                  onChange={e => { setEducationDegree(e.target.value); setEducationBranch('') }}>
                  <option value="">Select degree…</option>
                  {DEGREES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                {educationDegree && BRANCHES_BY_DEGREE[educationDegree] && (
                  <select className={inputCls} value={educationBranch} onChange={e => setEducationBranch(e.target.value)}>
                    <option value="">Select branch / specialization…</option>
                    {BRANCHES_BY_DEGREE[educationDegree].map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                )}
                <div className="relative">
                  <input className={inputCls} value={eduInstInput}
                    onChange={e => { setEduInstInput(e.target.value); setEducationInstitution(e.target.value); setShowEduInstSuggestions(true) }}
                    onFocus={() => setShowEduInstSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowEduInstSuggestions(false), 150)}
                    placeholder="Institution, e.g. IIT Delhi" />
                  {showEduInstSuggestions && eduInstInput.trim() && (() => {
                    const filtered = INSTITUTIONS.filter(i => i.toLowerCase().includes(eduInstInput.toLowerCase())).slice(0, 6)
                    return filtered.length > 0 ? (
                      <div className="absolute left-0 right-0 z-20 mt-1 bg-muted border border-border rounded-xl shadow-xl overflow-hidden top-full">
                        {filtered.map(inst => (
                          <button key={inst} type="button"
                            onMouseDown={() => { setEduInstInput(inst); setEducationInstitution(inst); setShowEduInstSuggestions(false) }}
                            className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-white/5 transition-colors">
                            {inst}
                          </button>
                        ))}
                      </div>
                    ) : null
                  })()}
                </div>
                <select className={inputCls} value={educationYear} onChange={e => setEducationYear(e.target.value)}>
                  <option value="">Graduation year…</option>
                  {Array.from({ length: 2030 - 1990 + 1 }, (_, i) => 2030 - i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            <hr className="border-border" />

            {/* Linked accounts */}
            <div>
              <p className="text-base font-semibold text-foreground mb-1">
                Linked accounts <span className="text-[var(--faint)] font-normal text-sm">(optional)</span>
              </p>
              <p className="text-sm text-[var(--faint)] mb-4">
                Add links to your LinkedIn or GitHub so clients can learn more about you.
              </p>
              <div className="space-y-3">
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
                    <svg className="w-4 h-4 fill-[#0a66c2]" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                  </div>
                  <input
                    className={`${inputCls} pl-9`}
                    type="url"
                    value={linkedinUrl}
                    onChange={e => setLinkedinUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/yourname"
                  />
                </div>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
                    <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                    </svg>
                  </div>
                  <input
                    className={`${inputCls} pl-9`}
                    type="url"
                    value={githubUrl}
                    onChange={e => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/yourname"
                  />
                </div>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* ── Fixed bottom nav ─────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40">
        <div className="max-w-[700px] mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          {/* Back */}
          {step > 1 ? (
            <button
              type="button"
              onClick={back}
              className="px-5 py-2.5 rounded-full border border-border text-sm font-medium text-foreground hover:bg-background transition-colors"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* Skip on step 3 only */}
            {step === 3 && (
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip for now
              </button>
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={next}
                className="px-6 py-2.5 rounded-full bg-[#14a800] text-foreground text-sm font-semibold hover:bg-[#0f7a00] transition-colors shadow-sm"
              >
                {NEXT_LABELS[step - 1]}
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="flex items-center gap-2 px-7 py-2.5 rounded-full bg-[#14a800] text-foreground text-sm font-semibold hover:bg-[#0f7a00] transition-colors shadow-sm disabled:opacity-60"
              >
                {submitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                  : <><Check className="w-4 h-4" /> Submit profile</>}
              </button>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}

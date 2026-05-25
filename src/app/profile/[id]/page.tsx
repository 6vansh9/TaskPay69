import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import ReviewList from '@/components/reviews/ReviewList'
import ExpandableBio from '@/components/profile/ExpandableBio'
import ShareButton from '@/components/profile/ShareButton'
import PortfolioLightbox from '@/components/profile/PortfolioLightbox'
import AvailabilityToggle from '@/components/profile/AvailabilityToggle'
import InviteToJobButton from '@/components/profile/InviteToJobButton'
import SaveFreelancerButton from '@/components/freelancers/SaveFreelancerButton'
import Link from 'next/link'
import {
  Star, MapPin, ExternalLink, CheckCircle2,
  Briefcase, Globe, Pencil, Plus, Clock, Languages,
  ShieldCheck, GraduationCap, Smartphone,
} from 'lucide-react'
import WorkHistorySection, { type WorkEntry } from '@/components/profile/WorkHistorySection'

interface PortfolioItem { title: string; description?: string; url?: string; image_url?: string }
interface SkillWithLevel { skill: string; level: string }
interface EducationEntry {
  institution?: string; degree?: string; field?: string
  from_year?: number | string; to_year?: number | string
}
interface LanguageEntry { name: string; proficiency?: string }

interface ProfileData {
  id: string
  full_name: string | null; avatar_url: string | null; title: string | null
  bio: string | null; hourly_rate: number | null; skills: string[] | null
  skills_with_level: SkillWithLevel[] | null; location: string | null; role: string
  rating: number; review_count: number; jobs_completed: number; total_earnings: number
  phone_verified: boolean; edu_verified: boolean; is_available: boolean
  company_name: string | null; experience_years: number | null
  portfolio: PortfolioItem[] | null; education: EducationEntry | EducationEntry[] | null
  linkedin_url: string | null; github_url: string | null
  languages: unknown
  industry: string | null; company_size: string | null; website: string | null
  work_history: WorkEntry[] | null
}

function parseLanguages(raw: unknown): LanguageEntry[] {
  if (!raw || !Array.isArray(raw)) return []
  return raw.flatMap(l => {
    if (typeof l === 'string' && l.trim()) return [{ name: l.trim() }]
    if (typeof l === 'object' && l !== null && 'name' in l) {
      const name = String((l as { name: unknown }).name ?? '').trim()
      const proficiency = typeof (l as { proficiency?: unknown }).proficiency === 'string'
        ? String((l as { proficiency: string }).proficiency)
        : undefined
      return name ? [{ name, proficiency }] : []
    }
    return []
  })
}

function responseTimeBadge(jobsCompleted: number): string | null {
  if (jobsCompleted === 0) return null
  if (jobsCompleted >= 20) return 'Usually responds within 2 hours'
  if (jobsCompleted >= 6)  return 'Usually responds within 12 hours'
  return 'Usually responds within 24 hours'
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles').select('full_name, title, bio, avatar_url, role, rating, hourly_rate')
    .eq('id', id).single()
  if (!profile) return { title: 'Profile Not Found' }
  const name  = profile.full_name ?? 'Freelancer'
  const title = profile.title ?? (profile.role === 'freelancer' ? 'Freelancer' : 'Client')
  const desc  = profile.bio ? profile.bio.slice(0, 155) + (profile.bio.length > 155 ? '…' : '') : `${name} is a ${title} on TaskPay.`
  const image = profile.avatar_url ?? '/hero-hire.jpg'
  return {
    title: `${name}: ${title}`,
    description: desc,
    openGraph: { title: `${name}: ${title} | TaskPay`, description: desc, images: [{ url: image, width: 400, height: 400, alt: name }] },
    twitter: { title: `${name}: ${title} | TaskPay`, description: desc, images: [image] },
    alternates: { canonical: `https://taskpay69.vercel.app/profile/${id}` },
  }
}

export default async function FreelancerProfilePage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ preview?: string }>
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams])
  const isPreview = sp.preview === '1'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isOwnProfile    = user?.id === id
  const showEditControls = isOwnProfile && !isPreview

  // Fetch profile
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', id).single()

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">Profile not found</h1>
            <p className="text-muted-foreground">This profile doesn&apos;t exist or has been removed.</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  // Admin profile — simple card
  if ((profile as { role: string }).role === 'admin') {
    const ap = profile as unknown as ProfileData & { created_at?: string }
    const displayName = ap.full_name ?? 'Admin'
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-12">
          <div className="bg-card border border-border rounded-2xl p-8 flex flex-col items-center text-center gap-4">
            {ap.avatar_url
              ? <img src={ap.avatar_url} alt={displayName} className="w-20 h-20 rounded-full object-cover" />
              : <div className="w-20 h-20 rounded-full bg-purple-950/50 border border-purple-800/50 flex items-center justify-center text-3xl font-bold text-purple-400">{displayName[0]?.toUpperCase()}</div>
            }
            <div>
              <h1 className="text-2xl font-bold text-foreground">{displayName}</h1>
              <span className="inline-block mt-2 px-3 py-1 rounded-full bg-purple-950/50 text-purple-400 text-sm font-semibold border border-purple-800/50">Admin</span>
            </div>
            {ap.created_at && <p className="text-sm text-[var(--faint)]">Member since {new Date(ap.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })}</p>}
            <p className="text-sm text-muted-foreground">Platform administrator</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  const p = profile as unknown as ProfileData
  const isFreelancer = p.role === 'freelancer'
  const displayName  = p.full_name ?? p.company_name ?? 'User'
  const initial      = displayName[0]?.toUpperCase() ?? '?'

  const education : EducationEntry[]  = p.education ? (Array.isArray(p.education) ? p.education : [p.education]) : []
  const portfolio : PortfolioItem[]   = p.portfolio ?? []
  const skills    : string[]          = p.skills ?? []
  const workHistory: WorkEntry[]      = Array.isArray(p.work_history) ? p.work_history : []
  const languages : LanguageEntry[]   = parseLanguages(p.languages)
  const respBadge  = isFreelancer ? responseTimeBadge(p.jobs_completed ?? 0) : null

  // Viewer is a client (not owner, not freelancer) → fetch their open jobs for Invite button + saved state
  let viewerIsClient = false
  let clientOpenJobs: { id: string; title: string }[] = []
  let isFreelancerSaved = false
  if (user && !isOwnProfile && isFreelancer) {
    const { data: viewerProfile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()
    if (viewerProfile?.role === 'client') {
      viewerIsClient = true
      const [{ data: jobs }, { data: savedRow }] = await Promise.all([
        supabase.from('jobs').select('id, title')
          .eq('client_id', user.id).eq('status', 'open')
          .order('created_at', { ascending: false }).limit(10),
        supabase.from('saved_freelancers').select('id')
          .eq('user_id', user.id).eq('freelancer_id', id).maybeSingle(),
      ])
      clientOpenJobs = (jobs ?? []) as { id: string; title: string }[]
      isFreelancerSaved = !!savedRow
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <div className="flex-1 max-w-[1100px] mx-auto w-full px-4 sm:px-6 py-6">

        {/* ── Profile Header ─────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-5">
          <div className="flex flex-col sm:flex-row items-start gap-5">

            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {p.avatar_url
                ? <img src={p.avatar_url} alt={displayName} className="w-[80px] h-[80px] rounded-full object-cover ring-2 ring-border" />
                : <div className="w-[80px] h-[80px] rounded-full bg-[#14a800]/20 flex items-center justify-center text-3xl font-bold text-[#14a800]">{initial}</div>
              }
              {/* Availability dot */}
              {isFreelancer && (
                <span className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full border-2 border-card ${p.is_available ? 'bg-[#14a800]' : 'bg-muted-foreground'}`} title={p.is_available ? 'Available now' : 'Not available'} />
              )}
            </div>

            {/* Name + badges + meta */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="min-w-0">

                  {/* Name row */}
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-2xl font-bold text-foreground leading-tight">{displayName}</h1>
                    {/* Availability — toggle for own profile, badge for others */}
                    {isFreelancer && (
                      showEditControls
                        ? <AvailabilityToggle profileId={id} initialAvailable={p.is_available} />
                        : <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-semibold ${p.is_available ? 'bg-[#14a800]/15 border-[#14a800]/30 text-[#14a800]' : 'bg-muted border-border text-muted-foreground'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${p.is_available ? 'bg-[#14a800] animate-pulse' : 'bg-muted-foreground'}`} />
                            {p.is_available ? 'Available Now' : 'Not Available'}
                          </span>
                    )}
                  </div>

                  {/* Verified badges — prominent row */}
                  {(p.phone_verified || p.edu_verified) && (
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {p.edu_verified && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-xs font-semibold text-blue-400">
                          <GraduationCap className="w-3.5 h-3.5" /> Student Verified
                        </span>
                      )}
                      {p.phone_verified && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#14a800]/15 border border-[#14a800]/30 text-xs font-semibold text-[#14a800]">
                          <ShieldCheck className="w-3.5 h-3.5" /> ID Verified
                        </span>
                      )}
                    </div>
                  )}

                  {/* Location */}
                  {p.location && (
                    <p className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />{p.location}
                    </p>
                  )}

                  {/* Rating + jobs + response time */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-sm">
                    {p.rating > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-[#ff9100] fill-[#ff9100]" />
                        <span className="font-bold text-foreground">{Number(p.rating).toFixed(1)}</span>
                        <span className="text-muted-foreground">({p.review_count} review{p.review_count !== 1 ? 's' : ''})</span>
                      </span>
                    )}
                    {p.jobs_completed > 0 && (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Briefcase className="w-3.5 h-3.5" />{p.jobs_completed} job{p.jobs_completed !== 1 ? 's' : ''} completed
                      </span>
                    )}
                    {isFreelancer && respBadge && (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="w-3.5 h-3.5 flex-shrink-0" />{respBadge}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col sm:items-end gap-2 flex-shrink-0">
                  {showEditControls ? (
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <Link href={`/profile/${id}?preview=1`} className="px-4 py-2 rounded-full border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
                        Preview
                      </Link>
                      <Link href="/profile/edit" className="px-4 py-2 rounded-full bg-[#14a800] text-sm font-medium text-foreground hover:bg-[#0f7a00] transition-colors">
                        Edit profile
                      </Link>
                    </div>
                  ) : isPreview ? (
                    <Link href={`/profile/${id}`} className="px-4 py-2 rounded-full border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
                      ← Back to edit view
                    </Link>
                  ) : isFreelancer && !isOwnProfile ? (
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {viewerIsClient && (
                        <>
                          <SaveFreelancerButton
                            freelancerId={id}
                            initialSaved={isFreelancerSaved}
                            size="md"
                          />
                          <InviteToJobButton
                            freelancerId={id}
                            freelancerName={p.full_name?.split(' ')[0] ?? 'Freelancer'}
                            jobs={clientOpenJobs}
                          />
                        </>
                      )}
                      <Link
                        href={`/jobs/post?freelancer=${id}`}
                        className="px-5 py-2 rounded-full bg-[#14a800] text-sm font-semibold text-foreground hover:bg-[#0f7a00] transition-colors"
                      >
                        Hire {p.full_name?.split(' ')[0] ?? 'Freelancer'}
                      </Link>
                    </div>
                  ) : null}
                  <ShareButton />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Two-column body ─────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row gap-5 items-start">

          {/* ── Sidebar ──────────────────────────────────────────── */}
          <aside className="w-full lg:w-[268px] flex-shrink-0 space-y-4">

            {/* Rate & stats (freelancer) */}
            {isFreelancer && (
              <div className="bg-card border border-border rounded-2xl p-5 space-y-3.5">
                {p.hourly_rate != null && (
                  <Row label="Hourly rate">
                    <span className="text-base font-bold text-foreground">₹{p.hourly_rate.toLocaleString('en-IN')}/hr</span>
                  </Row>
                )}
                <Row label="Availability">
                  <span className={`text-sm font-semibold ${p.is_available ? 'text-[#14a800]' : 'text-muted-foreground'}`}>
                    {p.is_available ? 'Available Now' : 'Not Available'}
                  </span>
                </Row>
                {p.experience_years != null && p.experience_years > 0 && (
                  <Row label="Experience"><span className="text-sm font-medium text-foreground">{p.experience_years}+ yrs</span></Row>
                )}
                {p.jobs_completed > 0 && (
                  <Row label="Jobs done"><span className="text-sm font-medium text-foreground">{p.jobs_completed}</span></Row>
                )}
                {respBadge && (
                  <Row label="Response">
                    <span className="text-sm text-right font-medium text-muted-foreground leading-snug" style={{ maxWidth: 140 }}>{respBadge}</span>
                  </Row>
                )}
              </div>
            )}

            {/* Client company info */}
            {!isFreelancer && (p.company_name || p.industry || p.company_size || p.website) && (
              <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
                {p.company_name && <div><p className="text-[10px] uppercase tracking-widest text-[var(--faint)] mb-0.5">Company</p><p className="text-sm font-semibold text-foreground">{p.company_name}</p></div>}
                {p.industry    && <div><p className="text-[10px] uppercase tracking-widest text-[var(--faint)] mb-0.5">Industry</p><p className="text-sm text-foreground">{p.industry}</p></div>}
                {p.company_size && <div><p className="text-[10px] uppercase tracking-widest text-[var(--faint)] mb-0.5">Company size</p><p className="text-sm text-foreground">{p.company_size} employees</p></div>}
                {p.website && (
                  <a href={p.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-[#14a800] hover:underline">
                    <Globe className="w-3.5 h-3.5 flex-shrink-0" />Website<ExternalLink className="w-3 h-3 ml-auto text-[var(--faint)]" />
                  </a>
                )}
              </div>
            )}

            {/* Languages */}
            {isFreelancer && languages.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Languages className="w-4 h-4 text-[#14a800]" />
                    <h3 className="text-sm font-semibold text-foreground">Languages</h3>
                  </div>
                  {showEditControls && (
                    <Link href="/profile/edit" className="text-[var(--faint)] hover:text-[#14a800] transition-colors"><Pencil className="w-3.5 h-3.5" /></Link>
                  )}
                </div>
                <div className="space-y-2">
                  {languages.map((l, i) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <span className="text-sm text-foreground">{l.name}</span>
                      {l.proficiency && (
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{l.proficiency}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Social links */}
            {isFreelancer && (p.linkedin_url || p.github_url) && (
              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3">Linked accounts</h3>
                <div className="space-y-2.5">
                  {p.linkedin_url && (
                    <a href={p.linkedin_url.startsWith('http') ? p.linkedin_url : `https://${p.linkedin_url}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-sm text-foreground hover:text-[#14a800] transition-colors group">
                      <svg className="w-4 h-4 flex-shrink-0 fill-[#0a66c2]" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                      LinkedIn<ExternalLink className="w-3 h-3 ml-auto text-[var(--faint)] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  )}
                  {p.github_url && (
                    <a href={p.github_url.startsWith('http') ? p.github_url : `https://github.com/${p.github_url}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-sm text-foreground hover:text-[#14a800] transition-colors group">
                      <svg className="w-4 h-4 flex-shrink-0 fill-foreground" viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
                      GitHub<ExternalLink className="w-3 h-3 ml-auto text-[var(--faint)] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Education */}
            {isFreelancer && education.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-blue-400" />
                    <h3 className="text-sm font-semibold text-foreground">Education</h3>
                  </div>
                  {showEditControls && (
                    <Link href="/profile/edit" className="text-[var(--faint)] hover:text-[#14a800] transition-colors"><Pencil className="w-3.5 h-3.5" /></Link>
                  )}
                </div>
                <div className="space-y-4">
                  {education.map((edu, i) => (
                    <div key={i}>
                      {edu.institution && <p className="text-xs font-bold text-foreground uppercase tracking-wide leading-snug">{edu.institution}</p>}
                      {(edu.degree || edu.field) && <p className="text-sm text-muted-foreground mt-0.5">{[edu.degree, edu.field].filter(Boolean).join(', ')}</p>}
                      {(edu.from_year || edu.to_year) && <p className="text-xs text-[var(--faint)] mt-0.5">{edu.from_year}{edu.from_year && edu.to_year ? ' – ' : ''}{edu.to_year}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </aside>

          {/* ── Main Content ──────────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* Title + Rate */}
            {isFreelancer && (p.title || p.hourly_rate) && (
              <div className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold text-foreground leading-snug">{p.title ?? 'Freelancer'}</h2>
                    {skills.length > 0 && <p className="text-sm text-muted-foreground mt-1">{skills.slice(0, 5).join(' · ')}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {p.hourly_rate != null && <span className="text-xl font-bold text-foreground whitespace-nowrap">₹{p.hourly_rate.toLocaleString('en-IN')}/hr</span>}
                    {showEditControls && (
                      <Link href="/profile/edit" className="text-[var(--faint)] hover:text-[#14a800] transition-colors"><Pencil className="w-4 h-4" /></Link>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Bio */}
            {p.bio && (
              <div className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  {!isFreelancer && <h2 className="text-base font-semibold text-foreground">About</h2>}
                  {showEditControls && <Link href="/profile/edit" className="ml-auto text-[var(--faint)] hover:text-[#14a800] transition-colors"><Pencil className="w-4 h-4" /></Link>}
                </div>
                <ExpandableBio text={p.bio} />
              </div>
            )}

            {/* Portfolio — with lightbox */}
            {isFreelancer && (portfolio.length > 0 || showEditControls) && (
              <div className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-semibold text-foreground">Portfolio</h2>
                    {portfolio.length > 0 && <p className="text-xs text-muted-foreground mt-0.5">{portfolio.length} project{portfolio.length !== 1 ? 's' : ''} · click to expand</p>}
                  </div>
                  {showEditControls && portfolio.length > 0 && (
                    <Link href="/profile/edit" className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:border-[#14a800] hover:text-[#14a800] transition-colors">
                      <Plus className="w-4 h-4" />
                    </Link>
                  )}
                </div>
                <PortfolioLightbox items={portfolio} showEdit={showEditControls} />
              </div>
            )}

            {/* Work Experience */}
            {isFreelancer && (showEditControls || workHistory.length > 0) && (
              <WorkHistorySection initialEntries={workHistory} showEdit={showEditControls} />
            )}

            {/* Reviews */}
            {isFreelancer && (
              <div className="bg-card border border-border rounded-2xl p-5">
                <h2 className="text-base font-semibold text-foreground mb-4">Work history & reviews</h2>
                <ReviewList revieweeId={id} />
              </div>
            )}

            {/* Skills */}
            {isFreelancer && skills.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-foreground">Skills</h2>
                  {showEditControls && <Link href="/profile/edit" className="text-[var(--faint)] hover:text-[#14a800] transition-colors"><Pencil className="w-4 h-4" /></Link>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {skills.map(s => (
                    <span key={s} className="px-3.5 py-1.5 rounded-full border border-border bg-card text-sm text-foreground hover:border-[#14a800] hover:text-[#14a800] transition-colors cursor-default">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-sm text-muted-foreground flex-shrink-0">{label}</span>
      {children}
    </div>
  )
}

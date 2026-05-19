import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import VerificationBadge from '@/components/verification/VerificationBadge'
import ReviewList from '@/components/reviews/ReviewList'
import Link from 'next/link'
import { Star, MapPin, Briefcase, Pencil, DollarSign, ExternalLink } from 'lucide-react'

export default async function FreelancerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const isOwnProfile = user?.id === id

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (!profile || (profile as { role: string }).role === 'admin') notFound()

  const p = profile as {
    id: string; full_name: string | null; avatar_url: string | null
    title: string | null; bio: string | null; hourly_rate: number | null
    skills: string[] | null; location: string | null; role: string
    rating: number; review_count: number; jobs_completed: number
    total_earnings: number; phone_verified: boolean; edu_verified: boolean
    is_available: boolean; company_name: string | null
  }

  const isFreelancer = p.role === 'freelancer'
  const displayName = p.full_name ?? p.company_name ?? 'User'
  const initial = displayName[0]?.toUpperCase() ?? '?'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile card */}
        <div className="card p-6 sm:p-8 mb-6">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {p.avatar_url ? (
                <img src={p.avatar_url} alt={displayName} className="w-24 h-24 rounded-full object-cover" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center text-3xl font-bold text-indigo-700">
                  {initial}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
                  {p.title && <p className="text-gray-500 mt-0.5">{p.title}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isFreelancer && p.is_available && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                      Available for work
                    </span>
                  )}
                  {isOwnProfile && (
                    <Link href="/profile/edit" className="btn btn-secondary btn-sm">
                      <Pencil className="w-3.5 h-3.5" /> Edit Profile
                    </Link>
                  )}
                </div>
              </div>

              {/* Verification badges */}
              <div className="mt-3">
                <VerificationBadge phoneVerified={p.phone_verified} eduVerified={p.edu_verified} size="md" />
              </div>

              {/* Meta row */}
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
                {p.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />{p.location}
                  </span>
                )}
                {isFreelancer && p.hourly_rate && (
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4" />₹{p.hourly_rate.toLocaleString()}/hr
                  </span>
                )}
                {isFreelancer && p.jobs_completed > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4" />{p.jobs_completed} jobs completed
                  </span>
                )}
                {p.rating > 0 && (
                  <span className="flex items-center gap-1.5 text-amber-500 font-medium">
                    <Star className="w-4 h-4 fill-current" />
                    {Number(p.rating).toFixed(1)} ({p.review_count} review{p.review_count !== 1 ? 's' : ''})
                  </span>
                )}
              </div>

              {/* Bio */}
              {p.bio && (
                <p className="mt-4 text-gray-600 leading-relaxed text-sm">{p.bio}</p>
              )}

              {/* Skills */}
              {isFreelancer && p.skills && p.skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {p.skills.map(s => (
                    <span key={s} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">{s}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats (freelancer only) */}
        {isFreelancer && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Jobs Completed', value: p.jobs_completed, icon: Briefcase },
              { label: 'Total Earned', value: `₹${(p.total_earnings ?? 0).toLocaleString()}`, icon: DollarSign },
              { label: 'Rating', value: p.rating > 0 ? `${Number(p.rating).toFixed(1)} / 5` : '—', icon: Star },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="card p-4 text-center">
                <Icon className="w-5 h-5 text-indigo-500 mx-auto mb-1" />
                <div className="text-xl font-bold text-gray-900">{value}</div>
                <div className="text-xs text-gray-400 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Portfolio */}
        {isFreelancer && (() => {
          const portfolio = (profile as unknown as { portfolio?: { title: string; description: string; url: string }[] }).portfolio ?? []
          return portfolio.length > 0 ? (
            <div className="card p-6 mb-6">
              <h2 className="font-semibold text-gray-900 mb-4">Portfolio</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {portfolio.map((item, i) => (
                  <div key={i} className="border border-gray-200 rounded-xl p-4 hover:border-[#14a800]/40 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-medium text-gray-900 text-sm">{item.title}</h3>
                      {item.url && (
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-[#14a800] flex-shrink-0">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                    {item.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description}</p>}
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#14a800] hover:underline mt-2 block truncate">
                        {item.url.replace(/^https?:\/\//, '')}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null
        })()}

        {/* Reviews */}
        {isFreelancer && (
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              Client Reviews
            </h2>
            <ReviewList revieweeId={id} />
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}

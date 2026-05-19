import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import VerificationNudge from '@/components/verification/VerificationNudge'
import Link from 'next/link'
import { Briefcase, DollarSign, Star, FileText } from 'lucide-react'
import type { Profile } from '@/types/database'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: rawProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const profile = rawProfile as Profile | null
  if (!profile) { redirect('/auth/login'); return null }

  const isFreelancer = profile.role === 'freelancer'

  // Fetch active contracts count for clients
  let activeContracts = 0
  if (!isFreelancer) {
    const { count } = await supabase
      .from('contracts')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', user.id)
      .in('status', ['active', 'delivered'])
    activeContracts = count ?? 0
  }

  const p = profile as unknown as {
    jobs_completed: number; total_earnings: number; rating: number
    connects_balance: number; jobs_posted: number; total_spent: number
    phone_verified: boolean; edu_verified: boolean; role: string
    full_name: string | null
  }

  const stats = isFreelancer ? [
    { label: 'Jobs Completed',  value: p.jobs_completed,                                      icon: Briefcase },
    { label: 'Total Earned',    value: `₹${(p.total_earnings ?? 0).toLocaleString()}`,         icon: DollarSign },
    { label: 'Rating',          value: p.rating ? `${Number(p.rating).toFixed(1)} / 5` : '—', icon: Star },
    { label: 'Connects Left',   value: p.connects_balance,                                     icon: FileText },
  ] : [
    { label: 'Jobs Posted',      value: p.jobs_posted,                                    icon: Briefcase },
    { label: 'Total Spent',      value: `₹${(p.total_spent ?? 0).toLocaleString()}`,      icon: DollarSign },
    { label: 'Active Contracts', value: activeContracts,                                  icon: FileText },
    { label: 'Rating',           value: p.rating ? `${Number(p.rating).toFixed(1)}/5` : '—', icon: Star },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">

        {/* Welcome */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {p.full_name?.split(' ')[0] ?? 'there'} 👋
          </h1>
          <p className="text-gray-500 mt-1 text-sm capitalize">{profile.role} account</p>
        </div>

        {/* Verification nudge */}
        <VerificationNudge
          phoneVerified={p.phone_verified}
          eduVerified={p.edu_verified}
          role={profile.role ?? 'freelancer'}
        />

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map(({ label, value, icon: Icon }) => (
            <div key={label} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500">{label}</span>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-indigo-600" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{value}</div>
            </div>
          ))}
        </div>

        {/* Quick links */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {isFreelancer ? (
            <>
              <div className="card p-6">
                <h2 className="font-semibold text-gray-900 mb-2">Find your next project</h2>
                <p className="text-sm text-gray-500 mb-4">Browse open jobs matching your skills.</p>
                <Link href="/jobs" className="btn btn-primary btn-sm">Browse Jobs</Link>
              </div>
              <div className="card p-6">
                <h2 className="font-semibold text-gray-900 mb-2">Active contracts</h2>
                <p className="text-sm text-gray-500 mb-4">Track deliverables and milestones.</p>
                <Link href="/contracts" className="btn btn-secondary btn-sm">View Contracts</Link>
              </div>
              <div className="card p-6">
                <h2 className="font-semibold text-gray-900 mb-2">Your public profile</h2>
                <p className="text-sm text-gray-500 mb-4">A strong profile gets 3× more responses.</p>
                <Link href="/profile" className="btn btn-secondary btn-sm">View Profile</Link>
              </div>
            </>
          ) : (
            <>
              <div className="card p-6">
                <h2 className="font-semibold text-gray-900 mb-2">Post a new job</h2>
                <p className="text-sm text-gray-500 mb-4">Receive proposals from skilled freelancers within hours.</p>
                <Link href="/jobs/post" className="btn btn-primary btn-sm">Post a Job</Link>
              </div>
              <div className="card p-6">
                <h2 className="font-semibold text-gray-900 mb-2">Manage your jobs</h2>
                <p className="text-sm text-gray-500 mb-4">Review proposals and track posted jobs.</p>
                <Link href="/my-jobs" className="btn btn-secondary btn-sm">View My Jobs</Link>
              </div>
              <div className="card p-6">
                <h2 className="font-semibold text-gray-900 mb-2">Active contracts</h2>
                <p className="text-sm text-gray-500 mb-4">Monitor progress and release payments.</p>
                <Link href="/contracts" className="btn btn-secondary btn-sm">View Contracts</Link>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

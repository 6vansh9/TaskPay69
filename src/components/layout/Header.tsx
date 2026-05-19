'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Menu, X, ChevronDown, Briefcase, User, LogOut, Settings, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types/database'
import NotificationBell from '@/components/notifications/NotificationBell'

export default function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [user, setUser] = useState<Profile | null>(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (!authUser) return
      supabase.from('profiles').select('*').eq('id', authUser.id).single()
        .then(({ data }) => setUser(data))
    })

    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const isLanding = pathname === '/'

  return (
    <header
      className={cn(
        'sticky top-0 z-50 transition-all duration-200',
        scrolled || !isLanding
          ? 'bg-white border-b border-gray-200 shadow-sm'
          : 'bg-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">TaskPay</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/jobs" className={cn('btn btn-ghost text-sm', pathname.startsWith('/jobs') && 'text-indigo-600 bg-indigo-50')}>
              Find Work
            </Link>
            <Link href="/freelancers" className={cn('btn btn-ghost text-sm', pathname.startsWith('/freelancers') && 'text-indigo-600 bg-indigo-50')}>
              Find Talent
            </Link>
            {!user && (
              <Link href="/auth/register?role=client" className="btn btn-ghost text-sm">
                Post a Job
              </Link>
            )}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <NotificationBell userId={user.id} />

                {/* User Menu */}
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(v => !v)}
                    className="flex items-center gap-2 btn btn-ghost"
                  >
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.full_name ?? ''} className="w-7 h-7 rounded-full object-cover" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700">
                        {(user.full_name ?? 'U')[0].toUpperCase()}
                      </div>
                    )}
                    <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-[120px] truncate">
                      {user.full_name ?? 'Account'}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </button>

                  {userMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                      <div className="absolute right-0 mt-2 w-52 card z-20 py-1 overflow-hidden">
                        <div className="px-4 py-2.5 border-b border-gray-100">
                          <p className="text-sm font-medium text-gray-900 truncate">{user.full_name}</p>
                          <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                        </div>
                        <Link href="/dashboard" onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                          <User className="w-4 h-4" /> Dashboard
                        </Link>
                        <Link href="/contracts" onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                          <FileText className="w-4 h-4" /> My Contracts
                        </Link>
                        <Link href="/profile" onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                          <Settings className="w-4 h-4" /> Profile & Settings
                        </Link>
                        <button onClick={handleSignOut}
                          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 border-t border-gray-100">
                          <LogOut className="w-4 h-4" /> Sign out
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link href="/auth/login" className="btn btn-ghost text-sm">Log in</Link>
                <Link href="/auth/register" className="btn btn-primary text-sm">Sign up free</Link>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              className="md:hidden btn btn-ghost p-2"
              onClick={() => setMobileOpen(v => !v)}
              aria-label="Menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white px-4 py-3 flex flex-col gap-1">
          <Link href="/jobs" onClick={() => setMobileOpen(false)} className="btn btn-ghost justify-start">Find Work</Link>
          <Link href="/freelancers" onClick={() => setMobileOpen(false)} className="btn btn-ghost justify-start">Find Talent</Link>
          {user ? (
            <>
              <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="btn btn-ghost justify-start">Dashboard</Link>
              <button onClick={handleSignOut} className="btn btn-ghost justify-start text-red-600">Sign out</button>
            </>
          ) : (
            <>
              <Link href="/auth/login" onClick={() => setMobileOpen(false)} className="btn btn-secondary justify-start">Log in</Link>
              <Link href="/auth/register" onClick={() => setMobileOpen(false)} className="btn btn-primary justify-start">Sign up free</Link>
            </>
          )}
        </div>
      )}
    </header>
  )
}

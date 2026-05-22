'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import {
  Menu, X, Search, LogOut, Settings, FileText,
  HelpCircle, ChevronDown, Zap, Shield,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types/database'
import NotificationBell from '@/components/notifications/NotificationBell'
import MessagesNavBadge from '@/components/chat/MessagesNavBadge'
import { ThemeToggle } from '@/components/theme-toggle'

export default function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [user, setUser] = useState<Profile | null>(null)
  const [togglingAvail, setTogglingAvail] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (!authUser) return
      supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()
        .then(({ data }) => setUser(data))
    })
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  async function toggleAvailability() {
    if (!user) return
    setTogglingAvail(true)
    const supabase = createClient()
    const next = !user.is_available
    const { error } = await supabase
      .from('profiles')
      .update({ is_available: next })
      .eq('id', user.id)
    if (!error) setUser(u => u ? { ...u, is_available: next } : u)
    setTogglingAvail(false)
  }

  const isFreelancer = user?.role === 'freelancer'
  const isAdmin = (user?.role as string | undefined) === 'admin'

  const freelancerNav = [
    { href: '/jobs',      label: 'Find Work' },
    { href: '/contracts', label: 'Deliver Work' },
    { href: '/payouts',   label: 'Manage Finances' },
  ]

  const clientNav = [
    { href: '/freelancers', label: 'Find Talent' },
    { href: '/my-jobs',     label: 'My Jobs' },
    { href: '/payouts',     label: 'Manage Finances' },
  ]

  const adminNav = [
    { href: '/admin', label: 'Admin Panel' },
  ]

  const navLinks = user ? (isAdmin ? adminNav : isFreelancer ? freelancerNav : clientNav) : [
    { href: '/jobs',        label: 'Find Work' },
    { href: '/freelancers', label: 'Find Talent' },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-4 px-4 md:px-8">

        {/* Logo — left half uses --foreground so it adapts to light/dark */}
        <Link href="/" className="flex-shrink-0 flex items-center">
          <svg viewBox="0 0 680 160" width="180" height="42" xmlns="http://www.w3.org/2000/svg" aria-label="TaskPay">
            <defs>
              <clipPath id="nav-tp-left">
                <rect x="0" y="0" width="340" height="160"/>
              </clipPath>
              <clipPath id="nav-tp-right">
                <rect x="340" y="0" width="340" height="160"/>
              </clipPath>
            </defs>
            <text x="340" y="108" fontFamily="Georgia, serif" fontSize="88" fontWeight="400" letterSpacing="-3" style={{fill:'var(--foreground)'}} textAnchor="middle" clipPath="url(#nav-tp-left)">TaskPay</text>
            <text x="340" y="108" fontFamily="Georgia, serif" fontSize="88" fontWeight="400" letterSpacing="-3" fill="#14A800" textAnchor="middle" clipPath="url(#nav-tp-right)">TaskPay</text>
            <line x1="340" y1="22" x2="340" y2="118" stroke="#14A800" strokeWidth="1" opacity="0.35"/>
          </svg>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden flex-1 items-center gap-0.5 lg:flex">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors text-foreground/60 hover:bg-foreground/5 hover:text-foreground',
                pathname.startsWith(href) && 'bg-foreground/8 text-foreground'
              )}
            >
              {label}
            </Link>
          ))}
          {!user && (
            <Link
              href="/auth/register?role=client"
              className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors text-foreground/60 hover:bg-foreground/5 hover:text-foreground"
            >
              Post a Job
            </Link>
          )}
        </nav>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-1.5">
          {/* Search pill */}
          <div className="hidden items-center gap-2 rounded-full border border-border bg-muted px-4 py-2 lg:flex">
            <Search className="size-4 flex-shrink-0 text-foreground/40" />
            <input
              type="text"
              placeholder="Search jobs or talent"
              className="w-40 bg-transparent text-sm outline-none font-sans text-foreground placeholder:text-foreground/35"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = (e.target as HTMLInputElement).value.trim()
                  if (val) router.push(`/jobs?q=${encodeURIComponent(val)}`)
                }
              }}
            />
          </div>

          {user ? (
            <>
              <MessagesNavBadge userId={user.id} dark={true} />
              <NotificationBell userId={user.id} />

              {/* Connects pill — freelancer only */}
              {isFreelancer && (
                <Link
                  href="/connects"
                  className="hidden sm:flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/8 hover:bg-purple-500/15 hover:border-purple-500/50 px-3 py-1.5 transition-colors"
                  title="Buy Connects"
                >
                  <Zap className="size-3.5 text-purple-400" />
                  <span className="text-xs font-semibold text-purple-300 tabular-nums">{user.connects_balance ?? 0}</span>
                </Link>
              )}

              <ThemeToggle />

              {/* Help */}
              <Link
                href="/help"
                className="hidden sm:flex size-9 items-center justify-center rounded-md text-foreground/50 hover:bg-foreground/5 hover:text-foreground transition-colors"
                title="Help"
              >
                <HelpCircle className="size-4.5" />
              </Link>

              {/* Settings */}
              <Link
                href="/settings"
                className={cn(
                  'hidden sm:flex size-9 items-center justify-center rounded-md text-foreground/50 hover:bg-foreground/5 hover:text-foreground transition-colors',
                  pathname === '/settings' && 'text-foreground bg-foreground/8'
                )}
                title="Settings"
              >
                <Settings className="size-4.5" />
              </Link>

              {/* Avatar dropdown */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setUserMenuOpen(v => !v)}
                  className="flex items-center gap-2 rounded-full px-2 py-1.5 text-sm font-medium transition-colors text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
                >
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.full_name ?? ''} className="size-8 rounded-full object-cover ring-2 ring-transparent hover:ring-[#14a800]/40 transition-all" />
                  ) : (
                    <div className="size-8 rounded-full bg-[#14a800]/20 flex items-center justify-center text-xs font-semibold text-[#14a800]">
                      {(user.full_name ?? 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <ChevronDown className="size-3.5 opacity-50 hidden sm:block" />
                </button>

                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-60 rounded-xl border border-border bg-card shadow-2xl z-20 overflow-hidden">

                      {/* Header */}
                      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="" className="size-9 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="size-9 rounded-full bg-[#14a800]/20 flex items-center justify-center text-sm font-bold text-[#14a800] flex-shrink-0">
                            {(user.full_name ?? 'U')[0].toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{user.full_name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                        </div>
                      </div>

                      {/* Online toggle */}
                      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
                        <span className="text-sm text-foreground/70">Online for messages</span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={user.is_available ?? false}
                          onClick={toggleAvailability}
                          disabled={togglingAvail}
                          className={cn(
                            'relative w-9 h-[20px] rounded-full transition-colors flex-shrink-0 disabled:opacity-50',
                            user.is_available ? 'bg-[#14a800]' : 'bg-muted'
                          )}
                        >
                          <span className={cn(
                            'absolute top-0.5 w-4 h-4 bg-card rounded-full shadow-sm transition-transform',
                            user.is_available ? 'left-[calc(100%-18px)]' : 'left-0.5'
                          )} />
                        </button>
                      </div>

                      {/* Nav links */}
                      <div className="py-1">
                        {isAdmin && (
                          <Link href="/admin" onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-purple-400 hover:bg-purple-500/10 hover:text-purple-300 transition-colors">
                            <Shield className="size-4" /> Admin Panel
                          </Link>
                        )}
                        <Link href={`/profile/${user.id}`} onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground/70 hover:bg-foreground/5 hover:text-foreground transition-colors">
                          <div className="size-4 rounded-full bg-[#14a800]/20 flex items-center justify-center text-[9px] font-bold text-[#14a800]">
                            {(user.full_name ?? 'U')[0].toUpperCase()}
                          </div>
                          Your profile
                        </Link>
                        <Link href="/dashboard" onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground/70 hover:bg-foreground/5 hover:text-foreground transition-colors">
                          <FileText className="size-4" /> Dashboard
                        </Link>
                        <Link href="/contracts" onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground/70 hover:bg-foreground/5 hover:text-foreground transition-colors">
                          <FileText className="size-4" /> My Contracts
                        </Link>
                        <Link href="/settings" onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground/70 hover:bg-foreground/5 hover:text-foreground transition-colors">
                          <Settings className="size-4" /> Settings
                        </Link>
                      </div>

                      {/* Connects balance (freelancer only) */}
                      {isFreelancer && (
                        <Link
                          href="/connects"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center justify-between gap-2 px-4 py-3 border-t border-border bg-background hover:bg-[#14a800]/5 transition-colors group"
                        >
                          <div className="flex items-center gap-2 text-sm text-foreground/70 group-hover:text-foreground">
                            <Zap className="size-4 text-purple-400" />
                            <span>{user.connects_balance ?? 0} connects</span>
                          </div>
                          <span className="text-xs font-semibold text-[#14a800] bg-[#14a800]/10 px-2 py-0.5 rounded-full group-hover:bg-[#14a800]/20 transition-colors">
                            Buy →
                          </span>
                        </Link>
                      )}

                      {/* Sign out */}
                      <button onClick={handleSignOut}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 border-t border-border hover:bg-red-500/10 transition-colors">
                        <LogOut className="size-4" /> Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <ThemeToggle />
              <Link
                href="/auth/login"
                className="rounded-full px-4 py-2 text-sm font-medium transition-colors text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
              >
                Log in
              </Link>
              <Link
                href="/auth/register"
                className="rounded-full bg-[#14a800] px-5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-[#12a000]"
              >
                Sign up
              </Link>
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            className="inline-flex size-9 items-center justify-center rounded-md transition-colors text-foreground/70 hover:bg-foreground/5 hover:text-foreground md:hidden"
            onClick={() => setMobileOpen(v => !v)}
            aria-label="Menu"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="border-t border-border bg-background lg:hidden">
          <nav className="mx-auto flex max-w-[1400px] flex-col gap-1 px-4 py-3">
            {navLinks.map(({ href, label }) => (
              <Link key={href} href={href} onClick={() => setMobileOpen(false)}
                className="flex items-center rounded-md px-3 py-3 text-sm font-medium text-foreground/70 hover:bg-foreground/5 hover:text-foreground">
                {label}
              </Link>
            ))}
            {user ? (
              <>
                {isAdmin ? (
                  <Link href="/admin" onClick={() => setMobileOpen(false)}
                    className="flex items-center rounded-md px-3 py-3 text-sm font-medium text-purple-400 hover:bg-purple-500/10">
                    Admin Panel
                  </Link>
                ) : (
                  <Link href="/dashboard" onClick={() => setMobileOpen(false)}
                    className="flex items-center rounded-md px-3 py-3 text-sm font-medium text-foreground/70 hover:bg-foreground/5 hover:text-foreground">
                    Dashboard
                  </Link>
                )}
                <Link href="/settings" onClick={() => setMobileOpen(false)}
                  className="flex items-center rounded-md px-3 py-3 text-sm font-medium text-foreground/70 hover:bg-foreground/5 hover:text-foreground">
                  Settings
                </Link>
                <button onClick={handleSignOut}
                  className="flex items-center rounded-md px-3 py-3 text-sm font-medium text-red-400 text-left">
                  Sign out
                </button>
              </>
            ) : (
              <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
                <Link href="/auth/login" onClick={() => setMobileOpen(false)}
                  className="rounded-md px-3 py-2.5 text-sm font-medium text-foreground/70 hover:bg-foreground/5">
                  Log in
                </Link>
                <Link href="/auth/register" onClick={() => setMobileOpen(false)}
                  className="rounded-full bg-[#14a800] px-4 py-2.5 text-sm font-medium text-foreground text-center hover:bg-[#12a000]">
                  Sign up
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  LayoutDashboard, DollarSign, Banknote, AlertTriangle,
  Users, Briefcase, Settings, LogOut, Menu,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/admin',            icon: LayoutDashboard, label: 'Dashboard'  },
  { href: '/admin/financials', icon: DollarSign,      label: 'Financials' },
  { href: '/admin/payouts',    icon: Banknote,        label: 'Payouts'    },
  { href: '/admin/disputes',   icon: AlertTriangle,   label: 'Disputes'   },
  { href: '/admin/users',      icon: Users,           label: 'Users'      },
  { href: '/jobs',             icon: Briefcase,       label: 'Jobs'       },
]

function SidebarInner({
  pathname,
  onClose,
  onSignOut,
}: {
  pathname: string
  onClose: () => void
  onSignOut: () => void
}) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Link href="/admin" onClick={onClose} className="flex items-center gap-2.5 px-4 py-4 border-b border-[var(--muted)] flex-shrink-0">
        <Image src="/logo.png" width={28} height={28} alt="TaskPay" className="rounded-lg" />
        <div>
          <div className="text-sm font-bold text-foreground">taskpay</div>
          <div className="text-[10px] text-[var(--faint)] uppercase tracking-widest">Admin</div>
        </div>
      </Link>

      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                active
                  ? 'bg-[#14a800]/15 text-[#4ade80] border border-[#14a800]/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-2 py-2 border-t border-[var(--muted)] space-y-0.5 flex-shrink-0">
        <Link
          href="/profile"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Settings className="w-4 h-4" /> Settings
        </Link>
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-red-400 hover:bg-red-950/20 transition-colors"
        >
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>
    </div>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-52 flex-shrink-0 bg-card border-r border-[var(--muted)] fixed inset-y-0 left-0 z-40">
        <SidebarInner pathname={pathname} onClose={() => {}} onSignOut={signOut} />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-52 bg-card border-r border-[var(--muted)] z-10">
            <SidebarInner pathname={pathname} onClose={() => setMobileOpen(false)} onSignOut={signOut} />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 lg:ml-52 flex flex-col min-h-screen min-w-0">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-[var(--muted)] bg-card sticky top-0 z-30">
          <button onClick={() => setMobileOpen(true)} className="text-muted-foreground hover:text-foreground">
            <Menu className="w-5 h-5" />
          </button>
          <Image src="/logo.png" width={22} height={22} alt="TaskPay" className="rounded" />
          <span className="text-sm font-semibold text-foreground">TaskPay Admin</span>
        </div>
        {children}
      </div>
    </div>
  )
}

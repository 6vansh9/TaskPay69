'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Briefcase, Laptop, Building2, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

type Role = 'freelancer' | 'client'

export default function SelectRolePage() {
  const router = useRouter()
  const [role, setRole] = useState<Role>('freelancer')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // Ensure user is logged in; if already onboarded, go to dashboard
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/auth/login'); return }
      supabase.from('profiles').select('role, onboarding_complete').eq('id', user.id).maybeSingle()
        .then(({ data: profile }) => {
          if (profile?.onboarding_complete) { router.replace('/dashboard'); return }
          if (profile?.role) setRole(profile.role as Role)
          setChecking(false)
        })
    })
  }, [router])

  const handleContinue = async () => {
    setLoading(true)
    const res = await fetch('/api/auth/set-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    setLoading(false)
    if (!res.ok) { toast.error('Something went wrong. Please try again.'); return }
    router.push(role === 'client' ? '/onboarding/client' : '/onboarding/freelancer')
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-[#14a800] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#14a800] flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">TaskPay</span>
          </div>
        </div>

        <div className="card p-8">
          <h1 className="text-2xl font-bold text-foreground mb-1">How will you use TaskPay?</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Choose your role to get started. This cannot be changed later.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {([
              { value: 'freelancer', label: 'I want to work', sub: 'Find projects & get paid', icon: Laptop },
              { value: 'client',     label: 'I want to hire',  sub: 'Post jobs & find talent', icon: Building2 },
            ] as const).map(({ value, label, sub, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setRole(value)}
                className={cn(
                  'relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center',
                  role === value
                    ? 'border-[#14a800] bg-[#0f2a0f] text-[#14a800]'
                    : 'border-border bg-card text-muted-foreground hover:border-border'
                )}
              >
                {role === value && (
                  <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#14a800] flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-foreground" />
                  </span>
                )}
                <Icon className="w-6 h-6" />
                <div>
                  <div className="text-sm font-semibold">{label}</div>
                  <div className="text-xs opacity-70">{sub}</div>
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={handleContinue}
            disabled={loading}
            className="btn btn-primary w-full btn-lg"
          >
            {loading ? 'Saving…' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}

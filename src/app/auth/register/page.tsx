'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Briefcase, Laptop, Building2, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const schema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})
type FormData = z.infer<typeof schema>

type Role = 'freelancer' | 'client'

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [role, setRole] = useState<Role>((searchParams.get('role') as Role) ?? 'freelancer')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)

    // Pre-check: block if email already registered
    const checkRes = await fetch('/api/auth/check-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: data.email }),
    })
    if (checkRes.status === 409) {
      toast.error(
        'This email is already registered. Please sign in instead.',
        { duration: 5000 }
      )
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { data: signUpData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { full_name: data.full_name, role },
        emailRedirectTo: `${window.location.origin}/auth/callback?role=${role}`,
      },
    })
    setLoading(false)

    if (error) {
      // Handle duplicate email returned directly by Supabase
      if (error.message.toLowerCase().includes('already registered')) {
        toast.error('This email is already registered. Please sign in instead.')
        return
      }
      toast.error(error.message)
      return
    }

    if (signUpData?.session) {
      // Email confirmation is disabled — user is immediately logged in
      const dest = role === 'client' ? '/onboarding/client' : '/onboarding/freelancer'
      router.push(dest)
      router.refresh()
    } else {
      // Email confirmation enabled — user must verify before logging in
      toast.success('Check your email to verify your account, then sign in.')
      router.push('/auth/login')
    }
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?role=${role}`,
      },
    })
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-2/5 bg-gradient-to-br from-[#14a800] to-[#0a6300] flex-col justify-between p-12 text-foreground">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-card/20 flex items-center justify-center">
            <Briefcase className="w-4 h-4 text-foreground" />
          </div>
          <span className="text-xl font-bold">TaskPay</span>
        </Link>

        <div>
          <h1 className="text-3xl font-bold leading-tight mb-6">
            {role === 'freelancer' ? 'Start earning on your terms.' : 'Hire top talent, faster.'}
          </h1>
          <ul className="space-y-3 text-green-100">
            {(role === 'freelancer' ? [
              'Browse thousands of real projects',
              'Get paid securely via escrow',
              'Build your reputation with verified reviews',
              '50 free Connects every month',
            ] : [
              'Post a job in under 3 minutes',
              'Receive proposals from vetted freelancers',
              'Pay only when you approve the work',
              'Dispute protection on every project',
            ]).map(item => (
              <li key={item} className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-200 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-green-200 text-sm">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-foreground font-medium hover:underline">Sign in</Link>
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background overflow-y-auto">
        <div className="w-full max-w-md py-8">
          <div className="lg:hidden flex justify-center mb-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#14a800] flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">TaskPay</span>
            </Link>
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-1">Create your account</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-[#14a800] font-medium hover:underline">Sign in</Link>
          </p>

          {/* Role selector */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {([
              { value: 'freelancer', label: 'I want to work', sub: 'Find projects & get paid', icon: Laptop },
              { value: 'client', label: 'I want to hire', sub: 'Post jobs & find talent', icon: Building2 },
            ] as const).map(({ value, label, sub, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setRole(value)}
                className={cn(
                  'relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center',
                  role === value
                    ? 'border-[#14a800] bg-[#14a800/20] text-[#14a800]'
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

          <p className="text-xs text-muted-foreground -mt-3 mb-4 text-center">
            Your role is permanent and cannot be changed after signup.
          </p>

          {/* Google */}
          <button onClick={handleGoogle} disabled={googleLoading} className="btn btn-secondary w-full mb-4 gap-3">
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {googleLoading ? 'Redirecting…' : 'Continue with Google'}
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs text-[var(--faint)] bg-background px-2 mx-auto w-fit">or sign up with email</div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Full name</label>
              <input type="text" className="input" placeholder="Arjun Mehta" {...register('full_name')} />
              {errors.full_name && <p className="mt-1 text-xs text-red-500">{errors.full_name.message}</p>}
            </div>

            <div>
              <label className="label">Email address</label>
              <input type="email" className="input" placeholder="you@example.com" {...register('email')} />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="Min. 8 characters"
                  {...register('password')}
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--faint)] hover:text-muted-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary w-full btn-lg">
              {loading ? 'Creating account…' : `Create ${role === 'freelancer' ? 'freelancer' : 'client'} account`}
            </button>
          </form>

          <p className="text-xs text-[var(--faint)] text-center mt-4">
            By signing up, you agree to our{' '}
            <Link href="#" className="underline">Terms</Link> and{' '}
            <Link href="#" className="underline">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="skeleton w-8 h-8 rounded-full" /></div>}>
      <RegisterForm />
    </Suspense>
  )
}

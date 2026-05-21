'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Briefcase } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
type FormData = z.infer<typeof schema>

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/dashboard'
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    const supabase = createClient()
    const { data: authData, error } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password })
    if (error) {
      setLoading(false)
      toast.error(error.message === 'Invalid login credentials' ? 'Incorrect email or password.' : error.message)
      return
    }

    const userId = authData.user?.id
    if (userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role, onboarding_complete')
        .eq('id', userId)
        .maybeSingle()

      const name = profile?.full_name?.split(' ')[0] ?? 'there'
      toast.success(`Welcome back, ${name}!`)

      if (!profile?.onboarding_complete) {
        const dest = profile?.role === 'client' ? '/onboarding/client' : '/onboarding/freelancer'
        router.push(dest)
      } else if (profile?.role === 'admin') {
        router.push('/admin')
      } else {
        router.push(next)
      }
    } else {
      router.push(next)
    }
    setLoading(false)
    router.refresh()
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${next}` },
    })
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-[#14a800] to-[#0a6300] flex-col justify-between p-12 text-foreground">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-card/20 flex items-center justify-center">
            <Briefcase className="w-4 h-4 text-foreground" />
          </div>
          <span className="text-xl font-bold">TaskPay</span>
        </Link>

        <div>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Welcome back.<br />Your next project awaits.
          </h1>
          <p className="text-green-100 text-lg">
            Thousands of clients and freelancers trust TaskPay to get work done.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          {[['10K+', 'Freelancers'], ['5K+', 'Jobs Posted'], ['₹2Cr+', 'Paid Out']].map(([val, label]) => (
            <div key={label} className="bg-card/10 rounded-xl p-4">
              <div className="text-2xl font-bold">{val}</div>
              <div className="text-green-100 text-sm">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex justify-center mb-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#14a800] flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">TaskPay</span>
            </Link>
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-1">Sign in to your account</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Don&apos;t have an account?{' '}
            <Link href="/auth/register" className="text-[#14a800] font-medium hover:underline">Sign up free</Link>
          </p>

          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={googleLoading}
            className="btn btn-secondary w-full mb-4 gap-3"
          >
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
            <div className="relative flex justify-center text-xs text-[var(--faint)] bg-background px-2 mx-auto w-fit">or continue with email</div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <input type="email" className="input" placeholder="you@example.com" {...register('email')} />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <label className="label !mb-0">Password</label>
                <Link href="/auth/reset-password" className="text-xs text-[#14a800] hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
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
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="skeleton w-8 h-8 rounded-full" /></div>}>
      <LoginForm />
    </Suspense>
  )
}

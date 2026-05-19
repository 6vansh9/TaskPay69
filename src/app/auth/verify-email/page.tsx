import Link from 'next/link'
import { Mail, Briefcase } from 'lucide-react'

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Briefcase className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">TaskPay</span>
        </Link>

        <div className="card p-8">
          <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h1>
          <p className="text-gray-500 text-sm mb-6">
            We sent a verification link to your email address. Click the link to activate your account and start using TaskPay.
          </p>
          <p className="text-xs text-gray-400">
            Didn&apos;t receive it? Check your spam folder or{' '}
            <Link href="/auth/register" className="text-indigo-600 hover:underline">try a different email</Link>.
          </p>
        </div>

        <Link href="/auth/login" className="btn btn-ghost mt-6 text-sm">
          ← Back to sign in
        </Link>
      </div>
    </div>
  )
}

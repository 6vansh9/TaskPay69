import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Log In',
  description: 'Log in to your TaskPay account to manage jobs, contracts, and payments.',
  openGraph: {
    title: 'Log In | TaskPay',
    description: 'Log in to your TaskPay account to manage jobs, contracts, and payments.',
  },
  alternates: { canonical: 'https://taskpay69.vercel.app/auth/login' },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

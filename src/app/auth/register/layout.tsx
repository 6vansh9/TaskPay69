import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Create Account',
  description: 'Join TaskPay to hire top freelancers or find freelance work. Create your free account today.',
  openGraph: {
    title: 'Create Account | TaskPay',
    description: 'Join TaskPay to hire top freelancers or find freelance work. Create your free account today.',
  },
  alternates: { canonical: 'https://taskpay69.vercel.app/auth/register' },
}

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

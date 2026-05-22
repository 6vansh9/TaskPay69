import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Help Center',
  description: 'Get answers to common questions about TaskPay — payments, contracts, disputes, account settings, and more.',
  openGraph: {
    title: 'Help Center | TaskPay',
    description: 'Get answers to common questions about TaskPay — payments, contracts, disputes, and account settings.',
  },
  alternates: { canonical: 'https://taskpay69.vercel.app/help' },
}

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Find Freelance Jobs',
  description: 'Browse thousands of freelance jobs in design, development, writing, marketing, and more. Find work that matches your skills.',
  openGraph: {
    title: 'Find Freelance Jobs | TaskPay',
    description: 'Browse thousands of freelance jobs in design, development, writing, marketing, and more.',
    images: [{ url: '/hero-work.jpg', width: 1200, height: 630, alt: 'Find Freelance Jobs on TaskPay' }],
  },
  twitter: {
    title: 'Find Freelance Jobs | TaskPay',
    description: 'Browse thousands of freelance jobs in design, development, writing, and more.',
    images: ['/hero-work.jpg'],
  },
  alternates: { canonical: 'https://taskpay69.vercel.app/jobs' },
}

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

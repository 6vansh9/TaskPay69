import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Find Freelancers',
  description: 'Hire skilled freelancers for your projects. Browse profiles, compare rates, and find the perfect match for design, development, writing, and more.',
  openGraph: {
    title: 'Find Freelancers | TaskPay',
    description: 'Hire skilled freelancers for your projects. Browse profiles, compare rates, and find the perfect match.',
    images: [{ url: '/hero-hire.jpg', width: 1200, height: 630, alt: 'Find Freelancers on TaskPay' }],
  },
  twitter: {
    title: 'Find Freelancers | TaskPay',
    description: 'Hire skilled freelancers for your projects. Browse profiles and compare rates.',
    images: ['/hero-hire.jpg'],
  },
  alternates: { canonical: 'https://taskpay69.vercel.app/freelancers' },
}

export default function FreelancersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

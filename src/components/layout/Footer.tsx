import Link from 'next/link'

const SECTIONS = [
  {
    title: 'For Clients',
    links: [
      { label: 'How to hire',        href: '#' },
      { label: 'Post a Job',          href: '/jobs/post' },
      { label: 'Find Freelancers',    href: '/freelancers' },
      { label: 'Direct Contracts',    href: '#' },
      { label: 'Enterprise',          href: '#' },
    ],
  },
  {
    title: 'For Talent',
    links: [
      { label: 'How to find work',          href: '/jobs' },
      { label: 'Create Profile',            href: '/auth/register?role=freelancer' },
      { label: 'Find jobs worldwide',       href: '/jobs' },
      { label: 'Win work with proposals',   href: '#' },
      { label: 'Success stories',           href: '#' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Help & support',    href: '#' },
      { label: 'Success stories',   href: '#' },
      { label: 'Blog',              href: '#' },
      { label: 'Refer a client',    href: '#' },
      { label: 'Release notes',     href: '#' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About us',          href: '#' },
      { label: 'Careers',           href: '#' },
      { label: 'Our impact',        href: '#' },
      { label: 'Press',             href: '#' },
      { label: 'Contact us',        href: '#' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="border-t border-white/8 bg-background">
      <div className="mx-auto max-w-[1400px] px-4 py-16 md:px-8 md:py-20">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {SECTIONS.map(({ title, links }) => (
            <div key={title}>
              <h3 className="text-sm font-semibold text-foreground/90">{title}</h3>
              <ul className="mt-4 flex flex-col gap-3">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <Link href={href} className="text-sm text-foreground/45 hover:text-foreground/80 transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Social icons row */}
        <div className="mt-14 flex items-center gap-5">
          {[
            {
              label: 'LinkedIn',
              svg: <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z M4 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />,
            },
            {
              label: 'Twitter / X',
              svg: <path d="M4 4l16 16M4 20L20 4" strokeWidth="2" strokeLinecap="round" />,
            },
            {
              label: 'Instagram',
              svg: <><rect x="2" y="2" width="20" height="20" rx="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></>,
            },
            {
              label: 'YouTube',
              svg: <><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" /><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" /></>,
            },
          ].map(({ label, svg }) => (
            <Link key={label} href="#" aria-label={label}
              className="flex size-8 items-center justify-center text-foreground/35 hover:text-foreground/70 transition-colors">
              <svg className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                {svg}
              </svg>
            </Link>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-white/8 pt-8 text-sm text-foreground/35 md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground/80 font-sans">
              task<span className="text-[#14a800]">pay</span>
            </span>
            <span>© 2026 TaskPay. All rights reserved.</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {['Terms of Service', 'Privacy Policy', 'Accessibility', 'Sitemap'].map(label => (
              <Link key={label} href="#" className="hover:text-foreground/60 transition-colors">{label}</Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

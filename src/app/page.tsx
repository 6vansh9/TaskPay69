'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { ArrowRight, TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const TRENDING = [
  { name: 'AI Video',         change: 318,   dir: 'up'   as const },
  { name: 'AI UGC',           change: 1138,  dir: 'up'   as const },
  { name: 'Higgsfield',       change: 15350, dir: 'up'   as const },
  { name: 'Prompt Engineer',  change: 841,   dir: 'up'   as const },
  { name: 'Base44',           change: 1690,  dir: 'up'   as const },
  { name: 'Claude',           change: 438,   dir: 'up'   as const },
  { name: 'Open AI',          change: 71,    dir: 'down' as const },
  { name: 'Next.js Dev',      change: 350,   dir: 'up'   as const },
  { name: 'AI/ML Engineer',   change: 285,   dir: 'up'   as const },
  { name: 'SEO Specialist',   change: 226,   dir: 'up'   as const },
]

const TRUSTED_BY = ['Zepto', 'CRED', 'Groww', 'PhonePe', 'Meesho', 'Zomato', 'Swiggy']

const EMERGING_ROLES = [
  { title: 'AI Trainer',          desc: 'Refines AI model outputs',                 change: 56 },
  { title: 'Robotics Engineer',   desc: 'Designs autonomous systems',               change: 32 },
  { title: 'Chatbot Developer',   desc: 'Builds conversational experiences',        change: 31 },
  { title: 'Midjourney Artist',   desc: 'Creates visuals through prompt design',    change: 28 },
  { title: 'API Developer',       desc: 'Connects systems via scalable interfaces', change: 24 },
]

const IN_DEMAND = [
  { category: 'Development', skills: ['Full-Stack', 'Mobile Apps', 'WordPress', 'Webflow', 'Shopify'] },
  { category: 'Design',      skills: ['UI/UX', 'Logo Design', 'Brand Identity', 'Figma', 'Canva'] },
  { category: 'Marketing',   skills: ['Social Media', 'SEO', 'Google Ads', 'Email', 'Facebook Ads'] },
  { category: 'Admin',       skills: ['Content Moderation', 'Data Entry', 'Virtual Assistant', 'Research'] },
]

const TESTIMONIALS = [
  {
    quote: "TaskPay isn't just a hiring platform for us — it's a strategic partner. It's helped fill every technical gap, accelerating our delivery from months to weeks.",
    name: 'Rahul Sharma',
    title: 'Co-founder, CEO · NovaTech',
    initials: 'RS',
  },
  {
    quote: "We hired a React developer within 48 hours. The escrow payment system gave us complete confidence. We've now hired 14 freelancers across the platform.",
    name: 'Priya Singh',
    title: 'CTO · FinEdge',
    initials: 'PS',
  },
  {
    quote: "As a freelancer, TaskPay completely changed how I work. Clients are serious, payments are protected, and I've tripled my income in 6 months.",
    name: 'Aditya Kumar',
    title: 'Senior UI/UX Designer',
    initials: 'AK',
  },
]

const STATS = [
  { value: '10K+',  label: 'Skilled freelancers' },
  { value: '94%',   label: 'Client satisfaction' },
  { value: '₹2Cr+', label: 'Paid to talent' },
  { value: '4.8★',  label: 'Average rating' },
]

export default function LandingPage() {
  const [mode, setMode] = useState<'hire' | 'work'>('hire')
  const [tIdx, setTIdx] = useState(0)

  const prev = () => setTIdx(i => (i - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)
  const next = () => setTIdx(i => (i + 1) % TESTIMONIALS.length)

  return (
    <div className="bg-background text-foreground min-h-screen">
      <Header />

      {/* ── 1. Hero ──────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden">
        <div className="relative h-[680px] w-full md:h-[760px]">
          <div
            className={cn('absolute inset-0 bg-cover bg-center transition-opacity duration-700', mode === 'hire' ? 'opacity-100' : 'opacity-0')}
            style={{ backgroundImage: "url('/hero-hire.jpg')" }}
          />
          <div
            className={cn('absolute inset-0 bg-cover bg-center transition-opacity duration-700', mode === 'work' ? 'opacity-100' : 'opacity-0')}
            style={{ backgroundImage: "url('/hero-work.jpg')" }}
          />
          {/* Dark overlay — deeper than before */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-60" />

          <div className="relative mx-auto flex h-full max-w-[1400px] flex-col px-4 pt-10 md:px-8 md:pt-16">
            {/* Toggle */}
            <div className="inline-flex w-fit items-center rounded-full bg-black/40 p-1 ring-1 ring-white/20 backdrop-blur-sm">
              {(['hire', 'work'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={cn(
                    'rounded-full px-7 py-2 text-sm font-medium transition-all capitalize',
                    mode === m ? 'bg-white text-black' : 'text-foreground/80 hover:bg-white/10'
                  )}
                >
                  {m === 'hire' ? 'Hire' : 'Work'}
                </button>
              ))}
            </div>

            {/* Headline */}
            <div className="mt-12 max-w-2xl md:mt-16">
              {mode === 'hire' ? (
                <>
                  <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight text-foreground md:text-7xl">
                    Grow at the speed<br />of your ambition
                  </h1>
                  <p className="mt-6 max-w-lg text-lg leading-relaxed text-foreground/75 md:text-xl">
                    Hire experts who use AI to amplify their skills — turning complex work into results, fast.
                  </p>
                </>
              ) : (
                <>
                  <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight text-foreground md:text-7xl">
                    The future of work<br />is yours
                  </h1>
                  <p className="mt-6 max-w-lg text-lg leading-relaxed text-foreground/75 md:text-xl">
                    The freelance platform designed for the highly-skilled, highly-ambitious, and AI-fluent.
                  </p>
                </>
              )}
            </div>

            {/* CTA */}
            <div className="mt-10">
              {mode === 'hire' ? (
                <div className="flex items-center gap-2 rounded-full bg-white p-1.5 pr-2 shadow-2xl max-w-md">
                  <input
                    type="text"
                    placeholder="What skill are you looking for?"
                    className="flex-1 bg-transparent px-4 py-2 text-sm text-gray-800 outline-none placeholder:text-gray-400"
                  />
                  <Link
                    href="/jobs"
                    className="rounded-full bg-[#14a800] px-6 py-2.5 text-sm font-medium text-foreground hover:bg-[#0f7a00] transition-colors whitespace-nowrap"
                  >
                    Find talent
                  </Link>
                </div>
              ) : (
                <Link
                  href="/jobs"
                  className="inline-flex items-center gap-2 rounded-full bg-[#14a800] px-8 py-3.5 text-base font-medium text-foreground hover:bg-[#0f7a00] transition-colors"
                >
                  Find opportunities
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Trending ticker — dark bg, seamless with page */}
        <div className="border-y border-white/8 bg-background py-4">
          <div className="mx-auto flex max-w-[1400px] items-center gap-6 px-4 md:px-8">
            <div className="flex shrink-0 items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#14a800]">
              <span className="size-2 rounded-full bg-[#14a800]" />
              Trending Skills
            </div>
            <div className="relative flex-1 overflow-hidden">
              <div className="ticker-track flex w-max items-center gap-8">
                {[...TRENDING, ...TRENDING].map((s, i) => (
                  <div key={i} className="inline-flex items-center gap-2 whitespace-nowrap text-sm">
                    <span className="font-medium text-foreground/90">{s.name}</span>
                    {s.dir === 'up'
                      ? <TrendingUp className="size-3.5 text-[#14a800]" />
                      : <TrendingDown className="size-3.5 text-foreground/40" />}
                    <span className={cn('font-semibold', s.dir === 'up' ? 'text-[#14a800]' : 'text-foreground/40')}>
                      {s.dir === 'up' ? '+' : '-'}{s.change}%
                    </span>
                  </div>
                ))}
              </div>
              <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-background to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-background to-transparent" />
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Trusted by ───────────────────────────────────────── */}
      <section className="border-b border-white/8 py-10">
        <div className="mx-auto max-w-[1400px] px-4 md:px-8">
          <p className="mb-8 text-xs font-bold uppercase tracking-widest text-foreground/40 text-center">
            Trusted by 10,000+ businesses across India
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
            {TRUSTED_BY.map(name => (
              <span key={name} className="text-xl font-bold text-foreground/25 tracking-tight select-none hover:text-foreground/40 transition-colors">
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. "Hire for where work is headed" ──────────────────── */}
      <section className="border-b border-white/8 py-20 md:py-28 text-center">
        <div className="mx-auto max-w-[1400px] px-4 md:px-8">
          <h2 className="text-4xl font-semibold tracking-tight md:text-5xl">
            Hire for where work is headed
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-foreground/60 md:text-lg">
            From AI engineering to brand design, see the key roles driving growth across every vertical.
          </p>
          <Link
            href="/auth/register?role=client"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#14a800] px-8 py-3.5 text-sm font-medium text-foreground hover:bg-[#0f7a00] transition-colors"
          >
            Get started for free
          </Link>
        </div>
      </section>

      {/* ── 4. Emerging Roles + In-demand skills ────────────────── */}
      <section className="border-b border-white/8 py-16 md:py-24">
        <div className="mx-auto max-w-[1400px] px-4 md:px-8">
          <div className="grid gap-8 lg:grid-cols-2">

            {/* Emerging Roles */}
            <div className="rounded-3xl bg-gradient-to-br from-[#14a800]/25 via-[#14a800]/10 to-transparent p-8 ring-1 ring-[#14a800]/20 md:p-10">
              <h3 className="text-2xl font-semibold tracking-tight">Emerging Roles</h3>
              <div className="mt-8 flex flex-col">
                {EMERGING_ROLES.map((role, i) => (
                  <div
                    key={role.title}
                    className={cn('flex items-center justify-between gap-4 py-5', i < EMERGING_ROLES.length - 1 && 'border-b border-white/10')}
                  >
                    <div>
                      <p className="font-semibold text-foreground">{role.title}</p>
                      <p className="mt-0.5 text-sm text-foreground/50">{role.desc}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5 text-[#14a800]">
                      <TrendingUp className="size-4" />
                      <span className="text-sm font-bold">+{role.change}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* In-demand skills */}
            <div className="rounded-3xl bg-white/4 p-8 ring-1 ring-white/10 md:p-10">
              <h3 className="text-2xl font-semibold tracking-tight">In-demand skills</h3>
              <div className="mt-8 flex flex-col gap-6">
                {IN_DEMAND.map(({ category, skills }) => (
                  <div key={category}>
                    <p className="mb-3 text-sm font-semibold text-foreground/50">{category}</p>
                    <div className="flex flex-wrap gap-2">
                      {skills.map(skill => (
                        <Link
                          key={skill}
                          href={`/jobs?q=${encodeURIComponent(skill)}`}
                          className="rounded-full border border-white/12 bg-white/5 px-3.5 py-1.5 text-sm text-foreground/80 transition-colors hover:border-white/25 hover:bg-white/10 hover:text-foreground"
                        >
                          {skill}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. Testimonials ─────────────────────────────────────── */}
      <section className="border-b border-white/8 py-16 md:py-24">
        <div className="mx-auto max-w-[1400px] px-4 md:px-8">
          <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#14a800]/15 via-[#0d0d0d] to-background ring-1 ring-white/10">
            <div className="grid md:grid-cols-2">

              {/* Left */}
              <div className="flex flex-col justify-between p-10 md:p-14">
                <div>
                  <h2 className="text-3xl font-semibold tracking-tight leading-snug md:text-4xl">
                    Nimble teams,<br />notable impact
                  </h2>
                  <p className="mt-4 text-foreground/60">
                    See how clients like you scale results without added headcount.
                  </p>
                </div>
                <div className="mt-10 flex items-center gap-3">
                  <button
                    onClick={prev}
                    className="flex size-10 items-center justify-center rounded-full border border-white/15 text-foreground/60 transition-colors hover:border-white/30 hover:text-foreground"
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                  <button
                    onClick={next}
                    className="flex size-10 items-center justify-center rounded-full border border-white/15 text-foreground/60 transition-colors hover:border-white/30 hover:text-foreground"
                  >
                    <ChevronRight className="size-5" />
                  </button>
                  <span className="ml-2 text-sm text-foreground/40">{tIdx + 1} / {TESTIMONIALS.length}</span>
                </div>
              </div>

              {/* Right — testimonial */}
              <div className="border-t border-white/10 bg-white/4 p-10 md:border-l md:border-t-0 md:p-14">
                <div className="flex items-center gap-4 mb-6">
                  <div className="size-12 rounded-full bg-[#14a800]/30 ring-2 ring-[#14a800]/40 flex items-center justify-center text-sm font-bold text-[#14a800]">
                    {TESTIMONIALS[tIdx].initials}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{TESTIMONIALS[tIdx].name}</p>
                    <p className="text-sm text-foreground/50">{TESTIMONIALS[tIdx].title}</p>
                  </div>
                </div>
                <blockquote className="text-foreground/85 leading-relaxed text-lg">
                  &ldquo;{TESTIMONIALS[tIdx].quote}&rdquo;
                </blockquote>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. Stats bar ────────────────────────────────────────── */}
      <section className="border-b border-white/8 py-14">
        <div className="mx-auto max-w-[1400px] px-4 md:px-8">
          <dl className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {STATS.map(({ value, label }) => (
              <div key={label} className="text-center">
                <dd className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">{value}</dd>
                <dt className="mt-2 text-sm text-foreground/50">{label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── 7. Solutions ────────────────────────────────────────── */}
      <section className="border-b border-white/8 py-16 md:py-24">
        <div className="mx-auto max-w-[1400px] px-4 md:px-8">
          {/* Radial glow */}
          <div className="relative overflow-hidden rounded-3xl bg-[#0f1f0f]">
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="size-[600px] rounded-full bg-[#14a800]/10 blur-3xl" />
            </div>
            <div className="relative px-8 py-16 text-center md:px-16">
              <h2 className="text-4xl font-semibold tracking-tight md:text-5xl">
                Solutions for every stage of growth
              </h2>
            </div>
            <div className="relative grid gap-4 px-8 pb-12 md:grid-cols-2 md:px-12">
              {/* Starter card */}
              <div className="rounded-2xl border border-white/12 bg-white/4 p-8">
                <p className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-4">TaskPay Starter</p>
                <h3 className="text-xl font-semibold leading-snug mb-3">
                  Hire skilled talent fast — without long-term commitments or extra overhead
                </h3>
                <p className="text-sm text-foreground/55 mb-8">
                  Post jobs, review proposals, and pay only when work is approved. No subscription needed.
                </p>
                <Link
                  href="/auth/register?role=client"
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-2.5 text-sm font-medium text-foreground/80 hover:border-white/40 hover:text-foreground transition-colors"
                >
                  Explore Starter
                </Link>
              </div>
              {/* Pro card */}
              <div className="rounded-2xl bg-gradient-to-br from-[#14a800]/40 to-[#14a800]/15 p-8 ring-1 ring-[#14a800]/30">
                <p className="text-xs font-bold uppercase tracking-widest text-[#14a800]/80 mb-4">TaskPay Pro</p>
                <h3 className="text-xl font-semibold leading-snug mb-3">
                  Run initiatives at scale with premium contracts, vetted talent, and team controls
                </h3>
                <p className="text-sm text-foreground/55 mb-8">
                  Advanced milestone tracking, priority disputes, dedicated support, and team-level hiring.
                </p>
                <Link
                  href="/auth/register?role=client"
                  className="inline-flex items-center gap-2 rounded-full bg-[#14a800] px-6 py-2.5 text-sm font-medium text-foreground hover:bg-[#0f7a00] transition-colors"
                >
                  Explore Pro
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 8. Final CTA ────────────────────────────────────────── */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-[1400px] px-4 text-center md:px-8">
          <p className="text-xs font-bold uppercase tracking-widest text-[#14a800]">Get started today</p>
          <h2 className="mx-auto mt-4 max-w-2xl text-4xl font-semibold tracking-tight md:text-5xl">
            Join thousands of clients and freelancers already on TaskPay
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-foreground/60 md:text-lg">
            Post a job for free, receive proposals within hours, and pay only when you approve the work.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/auth/register?role=client"
              className="inline-flex items-center gap-2 rounded-full bg-[#14a800] px-8 py-3.5 text-sm font-medium text-foreground hover:bg-[#0f7a00] transition-colors"
            >
              Hire a freelancer <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/auth/register?role=freelancer"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-8 py-3.5 text-sm font-medium text-foreground/80 hover:border-white/40 hover:text-foreground transition-colors"
            >
              Find work
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

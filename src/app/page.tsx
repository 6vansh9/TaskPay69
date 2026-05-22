'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { ArrowRight, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, GraduationCap, Briefcase, ShieldCheck, CheckCircle2, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'
import LiveStats from '@/components/landing/LiveStats'

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

      {/* ── Live Stats Bar ──────────────────────────────────────── */}
      <section className="border-b border-white/8 py-5 bg-[#0a0a0a]">
        <div className="mx-auto max-w-[1400px] px-4 md:px-8 text-center">
          <LiveStats />
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

      {/* ── NEW A. Our Mission ──────────────────────────────────── */}
      <section className="border-b border-white/8 py-20 md:py-28 bg-[#0a0a0a]">
        <div className="mx-auto max-w-[1400px] px-4 md:px-8">
          <div className="flex flex-col gap-12 lg:flex-row lg:items-center lg:gap-24">

            {/* Left 40% — italic Georgia green */}
            <div className="flex-shrink-0 lg:w-[40%]">
              <p
                className="leading-[1.08] text-[#14a800]"
                style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 'clamp(44px, 6vw, 72px)' }}
              >
                the freedom<br />to earn
              </p>
            </div>

            {/* Right 60% */}
            <div className="lg:w-[60%]">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#14a800]">Our Mission</p>
              <h2
                className="mt-4 text-3xl font-bold tracking-wide text-white md:text-4xl lg:text-[2.6rem]"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                SKILLS DESERVE TO BE PAID
              </h2>
              <div className="mt-6 space-y-4 text-[15px] leading-[1.75] text-[#a3a3a3]">
                <p>Every student has a skill. Every skill deserves a paycheck. TaskPay was born from a simple frustration — being a college student with real skills but no way to monetize them.</p>
                <p>We applied to dozens of internships. Got ignored. So we built the solution ourselves.</p>
                <p>TaskPay is India&apos;s first student-centric freelance marketplace — built by a student, for students. Whether you design, code, write, or create — there is a client waiting for you right here.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── NEW B. What We Offer ─────────────────────────────────── */}
      <section className="border-b border-white/8 py-20 md:py-28 bg-[#111111]">
        <div className="mx-auto max-w-[1400px] px-4 md:px-8">

          <div className="mb-14 text-center">
            <h2 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">What We Offer</h2>
            <p className="mt-4 text-base text-[#a3a3a3] md:text-lg">Everything you need to earn from your skills</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Card 1 */}
            <div className="rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-8">
              <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-[#14a800]/15">
                <GraduationCap className="size-6 text-[#14a800]" />
              </div>
              <h3 className="text-xl font-semibold text-white">Student-First Platform</h3>
              <p className="mt-3 text-sm leading-relaxed text-[#a3a3a3]">
                Built specifically for college and school students. No experience required — just skills and dedication to deliver great work.
              </p>
            </div>

            {/* Card 2 */}
            <div className="rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-8">
              <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-[#14a800]/15">
                <Briefcase className="size-6 text-[#14a800]" />
              </div>
              <h3 className="text-xl font-semibold text-white">Real Projects, Real Pay</h3>
              <p className="mt-3 text-sm leading-relaxed text-[#a3a3a3]">
                Connect with real clients who need real work. From logo design to web development — every skill has demand and every project pays.
              </p>
            </div>

            {/* Card 3 */}
            <div className="rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-8">
              <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-[#14a800]/15">
                <ShieldCheck className="size-6 text-[#14a800]" />
              </div>
              <h3 className="text-xl font-semibold text-white">Secure Escrow Payments</h3>
              <p className="mt-3 text-sm leading-relaxed text-[#a3a3a3]">
                Get paid safely. Your money is held in escrow until you deliver — no more working for free and hoping clients pay.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── NEW C. What Makes Us Different ──────────────────────── */}
      <section className="border-b border-white/8 py-20 md:py-28 bg-[#0a0a0a]">
        <div className="mx-auto max-w-[1400px] px-4 md:px-8">

          <div className="mb-14 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#14a800]">Why TaskPay</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-white md:text-5xl">What Makes Us Different?</h2>
            <p className="mt-4 text-base text-[#a3a3a3] md:text-lg">We are not just another freelance platform</p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {/* Card 1 */}
            <div className="rounded-2xl border-l-[3px] border-[#14a800] bg-[#111111] p-8">
              <div className="mb-4 flex items-center gap-3">
                <CheckCircle2 className="size-5 flex-shrink-0 text-[#14a800]" />
                <h3 className="text-lg font-semibold text-white">Student Verified Badges</h3>
              </div>
              <p className="text-sm leading-relaxed text-[#a3a3a3]">
                Our unique .edu email verification gives student freelancers a trust badge that clients love and competitors cannot offer.
              </p>
            </div>

            {/* Card 2 */}
            <div className="rounded-2xl border-l-[3px] border-[#14a800] bg-[#111111] p-8">
              <div className="mb-4 flex items-center gap-3">
                <CheckCircle2 className="size-5 flex-shrink-0 text-[#14a800]" />
                <h3 className="text-lg font-semibold text-white">Built for India</h3>
              </div>
              <p className="text-sm leading-relaxed text-[#a3a3a3]">
                INR payments, Indian universities, Indian clients. No dollar conversion, no international payment headaches.
              </p>
            </div>

            {/* Card 3 */}
            <div className="rounded-2xl border-l-[3px] border-[#14a800] bg-[#111111] p-8">
              <div className="mb-4 flex items-center gap-3">
                <CheckCircle2 className="size-5 flex-shrink-0 text-[#14a800]" />
                <h3 className="text-lg font-semibold text-white">Zero Experience Required</h3>
              </div>
              <p className="text-sm leading-relaxed text-[#a3a3a3]">
                Traditional platforms ignore beginners. We give students their first shot — because everyone starts somewhere.
              </p>
            </div>

            {/* Card 4 */}
            <div className="rounded-2xl border-l-[3px] border-[#14a800] bg-[#111111] p-8">
              <div className="mb-4 flex items-center gap-3">
                <CheckCircle2 className="size-5 flex-shrink-0 text-[#14a800]" />
                <h3 className="text-lg font-semibold text-white">AI-Powered Tools</h3>
              </div>
              <p className="text-sm leading-relaxed text-[#a3a3a3]">
                AI-assisted bio writing, cover letter generation, and smart job matching — because students deserve the best tools too.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── NEW D. Founder ──────────────────────────────────────── */}
      <section className="border-y border-white/8 py-20 md:py-28" style={{ background: '#0a0a0a' }}>
        <div className="mx-auto max-w-[1400px] px-4 md:px-8">
          <div className="flex flex-col items-center gap-12 lg:flex-row lg:items-center lg:gap-20">

            {/* Left — photo */}
            <div className="flex flex-col items-center gap-5 flex-shrink-0 lg:w-[40%]">
              <div className="relative">
                {/* Glow behind photo */}
                <div
                  className="absolute inset-0 rounded-full blur-2xl opacity-30 scale-110"
                  style={{ background: 'radial-gradient(circle, #14a800 0%, transparent 70%)' }}
                />
                {/* Photo */}
                <div
                  className="relative rounded-full overflow-hidden transition-transform duration-300 hover:scale-105"
                  style={{
                    width: 'clamp(200px, 22vw, 280px)',
                    height: 'clamp(200px, 22vw, 280px)',
                    border: '3px solid #14a800',
                    boxShadow: '0 0 40px rgba(20,168,0,0.25)',
                  }}
                >
                  <Image
                    src="/founder.jpeg"
                    alt="Vansh Aggarwal — Founder of TaskPay"
                    fill
                    className="object-cover object-top"
                    sizes="280px"
                    priority
                  />
                </div>
              </div>
              {/* Badge */}
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold text-[#14a800] tracking-wide"
                style={{ background: 'rgba(20,168,0,0.12)', border: '1px solid rgba(20,168,0,0.3)' }}
              >
                <span className="size-1.5 rounded-full bg-[#14a800]" />
                Founder &amp; Builder
              </span>
            </div>

            {/* Right — bio */}
            <div className="lg:w-[60%] space-y-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#14a800]">Meet the Founder</p>
                <h2 className="mt-3 text-4xl font-bold tracking-tight text-white md:text-5xl">
                  Vansh Aggarwal
                </h2>
                <p className="mt-2 text-base font-medium text-[#14a800]">
                  Front-End Developer · B.Tech CSE @ Manipal University Jaipur
                </p>
              </div>

              <div className="space-y-4 text-[15px] leading-[1.8] text-[#a3a3a3]">
                <p>
                  I built TaskPay because I know the frustration firsthand. As a CSE student at Manipal, I applied
                  to dozens of internships and got ignored — not because I lacked skills, but because I lacked
                  experience on paper.
                </p>
                <p>
                  So I stopped waiting for opportunities and built the platform I wished existed. TaskPay is for
                  every student who has skills but no stage to show them.
                </p>
              </div>

              {/* Tech stack pills */}
              <div className="flex flex-wrap gap-2">
                {['React.js', 'JavaScript', 'Next.js', 'TypeScript', 'Supabase'].map(tech => (
                  <span
                    key={tech}
                    className="rounded-full px-3.5 py-1.5 text-xs font-semibold text-[#14a800]"
                    style={{ background: '#1a1a1a', border: '1px solid rgba(20,168,0,0.35)' }}
                  >
                    {tech}
                  </span>
                ))}
              </div>

              {/* Social links */}
              <div className="flex flex-wrap gap-3">
                <a
                  href="https://www.linkedin.com/in/vansh-aggarwal-4114b6329/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-[#a3a3a3] transition-all hover:text-white"
                  style={{ background: '#111', border: '1px solid #2a2a2a' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#14a800')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = '#2a2a2a')}
                >
                  {/* LinkedIn icon */}
                  <svg className="size-4 text-[#14a800]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  LinkedIn
                </a>
                <a
                  href="https://github.com/6vansh9"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-[#a3a3a3] transition-all hover:text-white"
                  style={{ background: '#111', border: '1px solid #2a2a2a' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#14a800')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = '#2a2a2a')}
                >
                  {/* GitHub icon */}
                  <svg className="size-4 text-[#14a800]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/>
                  </svg>
                  GitHub
                </a>
                <a
                  href="mailto:6vansh9@gmail.com"
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-[#a3a3a3] transition-all hover:text-white"
                  style={{ background: '#111', border: '1px solid #2a2a2a' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#14a800')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = '#2a2a2a')}
                >
                  <Mail className="size-4 text-[#14a800]" />
                  Email
                </a>
              </div>

              {/* Quote */}
              <p className="text-base italic text-[#14a800] font-medium">
                &ldquo;Don&apos;t wait for opportunities. Build them.&rdquo;
              </p>
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

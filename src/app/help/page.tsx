'use client'

import { useState } from 'react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { Search, ChevronDown, ChevronUp, MessageSquare, Mail, BookOpen, Shield, CreditCard, Users, Zap, Briefcase } from 'lucide-react'
import toast from 'react-hot-toast'

const CATEGORIES = [
  { icon: BookOpen,    label: 'Getting Started',    desc: 'Create your account and set up your profile' },
  { icon: Users,       label: 'For Freelancers',    desc: 'Proposals, contracts, payouts and more' },
  { icon: Briefcase,   label: 'For Clients',        desc: 'Posting jobs, hiring, and managing projects' },
  { icon: CreditCard,  label: 'Payments & Billing', desc: 'Payments, invoices, and withdrawal help' },
  { icon: Shield,      label: 'Trust & Safety',     desc: 'Disputes, verification, and security' },
  { icon: Zap,         label: 'Account & Settings', desc: 'Profile settings, notifications, and privacy' },
]

const FAQS: { category: string; q: string; a: string }[] = [
  { category: 'Getting Started', q: 'How do I create a TaskPay account?', a: 'Click "Sign Up" on the homepage and choose whether you\'re a freelancer or a client. Fill in your details and verify your email to get started.' },
  { category: 'Getting Started', q: 'Can I use TaskPay as both a freelancer and a client?', a: 'Currently each account has a single role (freelancer or client). You can create a second account with a different email address for the other role.' },
  { category: 'For Freelancers', q: 'How do I submit a proposal?', a: 'Open a job listing and click "Submit Proposal". Write a personalised cover letter, set your rate, and optionally break the work into milestones before submitting.' },
  { category: 'For Freelancers', q: 'When do I get paid?', a: 'Payment is released when a client approves a milestone or marks the project complete. Funds are transferred to your linked bank account within 3–5 business days.' },
  { category: 'For Clients', q: 'How do I post a job?', a: 'Go to Dashboard → Post a Job. Describe the work, set a budget range, add required skills, and publish. Freelancers will start submitting proposals within minutes.' },
  { category: 'For Clients', q: 'How does milestone-based payment work?', a: 'When accepting a proposal you can agree on milestones. You fund each milestone upfront into escrow. The funds are only released to the freelancer once you approve the deliverable.' },
  { category: 'Payments & Billing', q: 'What fees does TaskPay charge?', a: 'TaskPay charges freelancers a 10% service fee on each payment received. Clients pay no additional fees beyond the agreed project price.' },
  { category: 'Payments & Billing', q: 'How do I withdraw my earnings?', a: 'Go to Dashboard → Earnings → Withdraw. Add your bank account details and submit a withdrawal request. Processing takes 3–5 business days.' },
  { category: 'Trust & Safety', q: 'What happens if there is a dispute?', a: 'Either party can raise a dispute from the contract page. Our team reviews the conversation history, deliverables, and milestone status, then makes a fair resolution decision within 5 business days.' },
  { category: 'Trust & Safety', q: 'How does identity verification work?', a: 'You can verify your phone number via OTP or your student status with a .edu email address. Verified profiles get a badge and rank higher in search results.' },
  { category: 'Account & Settings', q: 'How do I change my notification settings?', a: 'Go to Dashboard → Settings → Notifications. You can toggle email and in-app notifications for messages, proposals, payments, and more.' },
  { category: 'Account & Settings', q: 'Can I delete my account?', a: 'Yes. Go to Settings → Account → Delete Account. Note that deleting your account is permanent and any active contracts must be completed or cancelled first.' },
]

export default function HelpPage() {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' })
  const [sending, setSending] = useState(false)

  const filteredFaqs = FAQS.filter(faq => {
    const matchSearch = !search || faq.q.toLowerCase().includes(search.toLowerCase()) || faq.a.toLowerCase().includes(search.toLowerCase())
    const matchCat = !activeCategory || faq.category === activeCategory
    return matchSearch && matchCat
  })

  async function sendContact(e: React.FormEvent) {
    e.preventDefault()
    if (!contactForm.name.trim() || !contactForm.email.trim() || !contactForm.message.trim()) {
      toast.error('Please fill in all fields.')
      return
    }
    setSending(true)
    await new Promise(r => setTimeout(r, 800))
    setSending(false)
    toast.success('Message sent! We\'ll reply within 24 hours.')
    setContactForm({ name: '', email: '', message: '' })
  }

  const inputCls = 'w-full border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-[var(--faint)] focus:border-[#14a800] focus:outline-none focus:ring-2 focus:ring-[#14a800]/10 transition-colors bg-background'

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      {/* Hero */}
      <section className="bg-card border-b border-border py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">How can we help?</h1>
          <p className="text-muted-foreground mb-6">Search our knowledge base or browse by category below.</p>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--faint)]" />
            <input
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-[var(--faint)] focus:border-[#14a800] focus:outline-none focus:ring-2 focus:ring-[#14a800]/10 transition-colors"
              placeholder="Search for answers…"
              value={search}
              onChange={e => { setSearch(e.target.value); setActiveCategory(null) }}
            />
          </div>
        </div>
      </section>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-10 space-y-10">

        {/* Category cards */}
        {!search && (
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4">Browse by topic</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CATEGORIES.map(({ icon: Icon, label, desc }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setActiveCategory(activeCategory === label ? null : label)}
                  className={`text-left p-4 rounded-2xl border-2 transition-all ${
                    activeCategory === label
                      ? 'border-[#14a800] bg-[#14a800]/10'
                      : 'border-border bg-card hover:border-border'
                  }`}
                >
                  <Icon className={`w-5 h-5 mb-2 ${activeCategory === label ? 'text-[#14a800]' : 'text-muted-foreground'}`} />
                  <p className={`text-sm font-semibold ${activeCategory === label ? 'text-[#14a800]' : 'text-foreground'}`}>{label}</p>
                  <p className="text-xs text-[var(--faint)] mt-0.5 leading-relaxed">{desc}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* FAQ accordion */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              {activeCategory ? activeCategory : search ? `Results for "${search}"` : 'Frequently asked questions'}
            </h2>
            {(activeCategory || search) && (
              <button type="button" onClick={() => { setActiveCategory(null); setSearch('') }}
                className="text-sm text-[#14a800] hover:underline">
                Clear filter
              </button>
            )}
          </div>

          {filteredFaqs.length === 0 ? (
            <div className="text-center py-12 bg-card border border-border rounded-2xl">
              <p className="text-muted-foreground mb-2">No results found.</p>
              <p className="text-sm text-[var(--faint)]">Try a different search term or contact support below.</p>
            </div>
          ) : (
            <div className="border border-border rounded-2xl overflow-hidden divide-y divide-border">
              {filteredFaqs.map((faq, i) => (
                <div key={i}>
                  <button
                    type="button"
                    className="w-full text-left px-5 py-4 flex items-center justify-between gap-3 hover:bg-muted transition-colors"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <div>
                      {(search || !activeCategory) && (
                        <span className="text-[10px] font-bold text-[#14a800] uppercase tracking-widest block mb-0.5">{faq.category}</span>
                      )}
                      <span className="text-sm font-medium text-foreground">{faq.q}</span>
                    </div>
                    {openFaq === i
                      ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                  </button>
                  {openFaq === i && (
                    <div className="px-5 pb-5 bg-card">
                      <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Contact form */}
        <section className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-[#14a800]/15 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-[#14a800]" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Still need help?</h2>
              <p className="text-sm text-[var(--faint)]">Send us a message and we&apos;ll get back to you within 24 hours.</p>
            </div>
          </div>
          <form onSubmit={sendContact} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1.5">Your name</label>
                <input className={inputCls} value={contactForm.name}
                  onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Arjun Mehta" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1.5">Email address</label>
                <input type="email" className={inputCls} value={contactForm.email}
                  onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="you@example.com" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1.5">Message</label>
              <textarea className={`${inputCls} resize-none`} rows={4} value={contactForm.message}
                onChange={e => setContactForm(f => ({ ...f, message: e.target.value }))}
                placeholder="Describe your issue or question in detail…" />
            </div>
            <button type="submit" disabled={sending}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#14a800] text-foreground text-sm font-semibold hover:bg-[#0f7a00] transition-colors disabled:opacity-60">
              {sending ? 'Sending…' : <><Mail className="w-4 h-4" /> Send message</>}
            </button>
          </form>
        </section>

      </main>

      <Footer />
    </div>
  )
}

import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { ArrowRight, Shield, Zap, Star, Users, Briefcase, CheckCircle } from 'lucide-react'

const CATEGORIES = [
  'Web Development', 'Mobile Apps', 'UI/UX Design', 'Data Science',
  'Content Writing', 'Digital Marketing', 'Video Editing', 'Graphic Design',
]

const STATS = [
  { value: '10,000+', label: 'Skilled Freelancers' },
  { value: '5,000+', label: 'Jobs Posted' },
  { value: '₹2 Cr+', label: 'Total Paid Out' },
  { value: '4.8★', label: 'Average Rating' },
]

const HOW_IT_WORKS = [
  { step: '01', title: 'Post your job', desc: 'Describe your project, set your budget, and receive proposals within hours.' },
  { step: '02', title: 'Review proposals', desc: 'Compare freelancers by rating, skills, and price. Chat before you hire.' },
  { step: '03', title: 'Pay securely', desc: 'Funds are held in escrow and released only when you approve the work.' },
]

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 25px 25px, white 2px, transparent 0)', backgroundSize: '50px 50px' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <Zap className="w-3.5 h-3.5 text-yellow-300" />
            Escrow-protected payments on every project
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6 max-w-4xl mx-auto">
            Find the perfect freelancer for <span className="text-indigo-200">any job</span>
          </h1>
          <p className="text-xl text-indigo-100 mb-10 max-w-2xl mx-auto">
            TaskPay connects clients with top freelancers. Post a job, get proposals, hire confidently, and pay only when you&apos;re satisfied.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/register?role=client" className="btn btn-lg bg-white text-indigo-700 hover:bg-indigo-50 font-semibold shadow-lg">
              Post a Job — It&apos;s Free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/jobs" className="btn btn-lg bg-white/10 border border-white/30 text-white hover:bg-white/20">
              Browse Jobs
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {STATS.map(({ value, label }) => (
              <div key={label}>
                <div className="text-3xl font-bold text-gray-900 mb-1">{value}</div>
                <div className="text-sm text-gray-500">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Browse by category</h2>
          <p className="text-gray-500 text-center mb-10">Find top freelancers across every skill area</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {CATEGORIES.map(cat => (
              <Link
                key={cat}
                href={`/jobs?category=${encodeURIComponent(cat)}`}
                className="card p-5 hover:border-indigo-300 hover:shadow-md transition-all group cursor-pointer"
              >
                <div className="font-medium text-gray-800 group-hover:text-indigo-600 transition-colors text-sm">{cat}</div>
                <div className="text-xs text-gray-400 mt-1">Browse jobs →</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">How TaskPay works</h2>
          <p className="text-gray-500 text-center mb-12">Get from idea to done in three simple steps</p>
          <div className="grid md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map(({ step, title, desc }) => (
              <div key={step} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 border-2 border-indigo-100 flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-bold text-indigo-600">{step}</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-16 bg-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Shield, title: 'Secure Escrow', desc: 'Funds are held safely via Razorpay and released only on your approval.' },
              { icon: Star, title: 'Verified Reviews', desc: 'Every review comes from a completed contract — no fake ratings.' },
              { icon: Users, title: 'Quality Talent', desc: 'Freelancers are rated by skills, on-time delivery, and communication.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card p-6 flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-indigo-600 to-violet-700 text-white text-center">
        <div className="max-w-2xl mx-auto px-4">
          <Briefcase className="w-10 h-10 mx-auto mb-4 opacity-80" />
          <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-indigo-200 mb-8">Join thousands of clients and freelancers already using TaskPay.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/register?role=client" className="btn btn-lg bg-white text-indigo-700 hover:bg-indigo-50 font-semibold">
              <CheckCircle className="w-4 h-4" /> Hire a Freelancer
            </Link>
            <Link href="/auth/register?role=freelancer" className="btn btn-lg border border-white/40 text-white hover:bg-white/10">
              Find Work
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

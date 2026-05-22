'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Printer, CheckCircle, Star } from 'lucide-react'

interface CertData {
  contractId: string
  jobTitle: string
  freelancerName: string
  clientName: string
  completedAt: string
  skills: string[]
  rating: number | null
  certId: string
}

function StarRow({ n }: { n: number }) {
  return (
    <div className="flex items-center gap-1 justify-center">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`w-5 h-5 ${i <= n ? 'fill-amber-400 text-amber-400' : 'text-white/20'}`} />
      ))}
    </div>
  )
}

export default function CertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [cert, setCert] = useState<CertData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push(`/auth/login?next=/contracts/${id}/certificate`); return }

      const { data: contract } = await supabase
        .from('contracts')
        .select(`
          id, status, completed_at, client_id, freelancer_id, job_id,
          job:jobs(title, skills, skills_required),
          client:profiles!contracts_client_id_fkey(full_name, company_name),
          freelancer:profiles!contracts_freelancer_id_fkey(full_name)
        `)
        .eq('id', id)
        .single()

      if (!contract) { setError('Contract not found'); return }
      if (contract.status !== 'complete') { setError('Certificate is only available for completed contracts'); return }
      if (contract.client_id !== user.id && contract.freelancer_id !== user.id) {
        setError('Access denied'); return
      }

      const c = contract as unknown as {
        id: string
        status: string
        completed_at: string | null
        client_id: string
        freelancer_id: string
        job_id: string
        job: { title: string; skills?: string[] | null; skills_required?: string[] | null } | null
        client: { full_name: string | null; company_name: string | null } | null
        freelancer: { full_name: string | null } | null
      }

      // Fetch review rating for freelancer
      const { data: review } = await supabase
        .from('reviews')
        .select('rating')
        .eq('contract_id', id)
        .eq('reviewee_id', c.freelancer_id)
        .maybeSingle()

      const skills = (c.job?.skills ?? c.job?.skills_required ?? []) as string[]

      setCert({
        contractId: id,
        jobTitle: c.job?.title ?? 'Project',
        freelancerName: c.freelancer?.full_name ?? 'Freelancer',
        clientName: c.client?.company_name ?? c.client?.full_name ?? 'Client',
        completedAt: c.completed_at ?? new Date().toISOString(),
        skills,
        rating: (review as { rating: number } | null)?.rating ?? null,
        certId: `TASKPAY-${id.replace(/-/g, '').substring(0, 8).toUpperCase()}`,
      })
    })
  }, [id, router])

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center px-8">
          <p className="text-red-400 text-lg font-semibold mb-4">{error}</p>
          <button onClick={() => router.back()} className="text-[#14a800] hover:underline text-sm">← Go back</button>
        </div>
      </div>
    )
  }

  if (!cert) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#14a800]/40 border-t-[#14a800] rounded-full animate-spin" />
      </div>
    )
  }

  const completedDate = new Date(cert.completedAt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
    `https://taskpay69.vercel.app/contracts/${id}/certificate`
  )}&title=${encodeURIComponent(`I completed "${cert.jobTitle}" on TaskPay!`)}`

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #0a0a0a !important; }
          @page { size: A4 landscape; margin: 0; }
        }
      `}</style>

      {/* Action bar */}
      <div className="no-print fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 bg-[#0f0f0f]/95 backdrop-blur border-b border-white/8">
        <button onClick={() => router.back()} className="text-sm text-white/50 hover:text-white transition-colors">← Back</button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/8 border border-white/12 text-sm text-white/80 hover:bg-white/12 transition-colors"
          >
            <Printer className="w-4 h-4" /> Download PDF
          </button>
          <a
            href={linkedInUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0A66C2]/20 border border-[#0A66C2]/40 text-sm text-[#0A66C2] hover:bg-[#0A66C2]/30 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            Share on LinkedIn
          </a>
        </div>
      </div>

      {/* Certificate */}
      <div className="min-h-screen bg-[#050805] flex items-center justify-center py-20 px-4">
        <div
          className="w-full max-w-3xl mx-auto relative"
          style={{
            background: 'linear-gradient(135deg, #071207 0%, #0a1a0a 50%, #071207 100%)',
            border: '1px solid rgba(20,168,0,0.25)',
            borderRadius: 24,
            padding: '56px 64px',
            boxShadow: '0 0 80px rgba(20,168,0,0.08), 0 0 200px rgba(0,0,0,0.8)',
          }}
        >
          {/* Corner decorations */}
          {[
            'top-4 left-4 border-t border-l',
            'top-4 right-4 border-t border-r',
            'bottom-4 left-4 border-b border-l',
            'bottom-4 right-4 border-b border-r',
          ].map(cls => (
            <div key={cls} className={`absolute w-8 h-8 ${cls} border-[#14a800]/40`} style={{ borderRadius: 4 }} />
          ))}

          {/* Logo */}
          <div className="flex justify-center mb-8">
            <svg viewBox="0 0 680 160" width="160" height="38" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <clipPath id="cert-white"><rect x="0" y="0" width="340" height="160"/></clipPath>
                <clipPath id="cert-green"><rect x="340" y="0" width="340" height="160"/></clipPath>
              </defs>
              <text x="340" y="108" fontFamily="Georgia, serif" fontSize="88" fontWeight="400" letterSpacing="-3" fill="#ffffff" textAnchor="middle" clipPath="url(#cert-white)">TaskPay</text>
              <text x="340" y="108" fontFamily="Georgia, serif" fontSize="88" fontWeight="400" letterSpacing="-3" fill="#14A800" textAnchor="middle" clipPath="url(#cert-green)">TaskPay</text>
              <line x1="340" y1="22" x2="340" y2="118" stroke="#14A800" strokeWidth="1" opacity="0.35"/>
            </svg>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#14a800]/40 to-transparent" />
            <div className="w-2 h-2 rounded-full bg-[#14a800]" />
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#14a800]/40 to-transparent" />
          </div>

          {/* Heading */}
          <div className="text-center mb-10">
            <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-[#14a800]/70 mb-3">
              Certificate of Completion
            </p>
            <p className="text-white/50 text-sm mb-6">This certifies that</p>
            <h1
              className="text-4xl font-bold mb-4"
              style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #a8f0a0 50%, #14a800 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {cert.freelancerName}
            </h1>
            <p className="text-white/60 text-base leading-relaxed max-w-lg mx-auto">
              successfully completed{' '}
              <span className="text-white font-semibold">&ldquo;{cert.jobTitle}&rdquo;</span>
              {' '}for{' '}
              <span className="text-white font-semibold">{cert.clientName}</span>
              {' '}on TaskPay
            </p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-6 mb-10">
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Completed On</p>
              <p className="text-sm font-semibold text-white/80">{completedDate}</p>
            </div>
            <div className="text-center border-x border-white/8">
              <p className="text-[10px] uppercase tracking-widest text-white/30 mb-2">Rating Received</p>
              {cert.rating ? (
                <StarRow n={cert.rating} />
              ) : (
                <p className="text-sm text-white/40">—</p>
              )}
            </div>
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Certificate ID</p>
              <p className="text-xs font-mono font-semibold text-[#14a800]">{cert.certId}</p>
            </div>
          </div>

          {/* Skills */}
          {cert.skills.length > 0 && (
            <div className="text-center mb-10">
              <p className="text-[10px] uppercase tracking-widest text-white/30 mb-3">Skills Demonstrated</p>
              <div className="flex flex-wrap justify-center gap-2">
                {cert.skills.map(s => (
                  <span
                    key={s}
                    className="px-3 py-1 rounded-full text-xs font-medium"
                    style={{ background: 'rgba(20,168,0,0.12)', border: '1px solid rgba(20,168,0,0.25)', color: '#6ee860' }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#14a800]/30 to-transparent" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#14a800]/50" />
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#14a800]/30 to-transparent" />
          </div>

          {/* Verified badge */}
          <div className="flex items-center justify-center gap-3">
            <div
              className="flex items-center gap-2 px-5 py-2.5 rounded-full"
              style={{ background: 'rgba(20,168,0,0.1)', border: '1px solid rgba(20,168,0,0.3)' }}
            >
              <CheckCircle className="w-4 h-4 text-[#14a800]" />
              <span className="text-sm font-semibold text-[#14a800]">Verified by TaskPay</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

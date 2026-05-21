'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import toast from 'react-hot-toast'
import {
  User, Bell, Shield, Trash2, AlertTriangle,
  Loader2, CheckCircle2, Mail, Calendar,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NotifPrefs {
  message: boolean
  bid_received: boolean
  hired: boolean
  payment: boolean
  review: boolean
}

interface Profile {
  id: string
  email: string | null
  full_name: string | null
  role: string
  created_at: string
  phone_verified: boolean
  edu_verified: boolean
  notification_prefs: NotifPrefs | null
}

const NOTIF_LABELS: { key: keyof NotifPrefs; label: string; desc: string }[] = [
  { key: 'message',      label: 'New messages',         desc: 'When someone sends you a chat message' },
  { key: 'bid_received', label: 'New proposals',         desc: 'When a freelancer applies to your job' },
  { key: 'hired',        label: 'Hired / contract start', desc: 'When a client accepts your proposal' },
  { key: 'payment',      label: 'Payments & escrow',     desc: 'When funds are released or transferred' },
  { key: 'review',       label: 'Reviews',               desc: 'When someone leaves you a review' },
]

const CONFIRM_PHRASE = 'delete my account'

export default function SettingsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  // Notification prefs
  const [prefs, setPrefs] = useState<NotifPrefs>({
    message: true, bid_received: true, hired: true, payment: true, review: true,
  })
  const [savingPrefs, setSavingPrefs] = useState(false)

  // Delete flow
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const confirmInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/auth/login?next=/settings'); return }
      supabase
        .from('profiles')
        .select('id,email,full_name,role,created_at,phone_verified,edu_verified,notification_prefs')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setProfile(data as Profile)
            if (data.notification_prefs) {
              setPrefs({ ...prefs, ...(data.notification_prefs as NotifPrefs) })
            }
          }
          setLoading(false)
        })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Focus the confirm input when modal opens
  useEffect(() => {
    if (showDeleteModal) {
      setConfirmText('')
      setTimeout(() => confirmInputRef.current?.focus(), 50)
    }
  }, [showDeleteModal])

  async function saveNotifPrefs() {
    setSavingPrefs(true)
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notification_prefs: prefs }),
    })
    setSavingPrefs(false)
    if (!res.ok) { toast.error('Failed to save preferences'); return }
    toast.success('Notification preferences saved')
  }

  async function handleDeleteAccount() {
    if (confirmText.toLowerCase() !== CONFIRM_PHRASE) return
    setDeleting(true)
    const res = await fetch('/api/account/delete', { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    setDeleting(false)
    if (!res.ok) {
      toast.error(data.error ?? 'Failed to delete account')
      setShowDeleteModal(false)
      return
    }
    toast.success('Account deleted')
    router.push('/')
  }

  const canConfirm = confirmText.toLowerCase() === CONFIRM_PHRASE

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#14a800]" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-8 space-y-5">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>

        {/* ── Account Information ──────────────────────────────────── */}
        <section className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2.5 px-6 py-4 border-b border-border">
            <User className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Account</h2>
          </div>
          <div className="px-6 py-5 space-y-4">
            <Row label="Name">
              <span className="text-sm text-foreground font-medium">
                {profile?.full_name ?? '—'}
              </span>
            </Row>
            <Row label={<span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />Email</span>}>
              <span className="text-sm text-foreground">{profile?.email ?? '—'}</span>
            </Row>
            <Row label="Role">
              <span className="text-sm capitalize text-foreground">{profile?.role}</span>
            </Row>
            <Row label={<span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Member since</span>}>
              <span className="text-sm text-muted-foreground">
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
                  : '—'}
              </span>
            </Row>
            <Row label="Identity">
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {profile?.phone_verified ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-[#14a800]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Phone verified
                  </span>
                ) : (
                  <span className="text-xs text-[var(--faint)]">Phone not verified</span>
                )}
                {profile?.edu_verified ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-[#14a800]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Edu verified
                  </span>
                ) : null}
              </div>
            </Row>
          </div>
        </section>

        {/* ── Notification Preferences ─────────────────────────────── */}
        <section className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2.5 px-6 py-4 border-b border-border">
            <Bell className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Email Notifications</h2>
          </div>
          <div className="divide-y divide-border">
            {NOTIF_LABELS.map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between gap-4 px-6 py-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-[var(--faint)] mt-0.5">{desc}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={prefs[key]}
                  onClick={() => setPrefs(p => ({ ...p, [key]: !p[key] }))}
                  className={cn(
                    'relative w-10 h-[22px] rounded-full transition-colors flex-shrink-0',
                    prefs[key] ? 'bg-[#14a800]' : 'bg-muted'
                  )}
                >
                  <span className={cn(
                    'absolute top-0.5 w-[18px] h-[18px] bg-card rounded-full shadow-sm transition-transform',
                    prefs[key] ? 'left-[calc(100%-20px)]' : 'left-0.5'
                  )} />
                </button>
              </div>
            ))}
          </div>
          <div className="px-6 py-4 border-t border-border flex justify-end">
            <button
              type="button"
              onClick={saveNotifPrefs}
              disabled={savingPrefs}
              className="flex items-center gap-2 px-5 py-2 rounded-full bg-[#14a800] text-foreground text-sm font-semibold hover:bg-[#0f7a00] transition-colors disabled:opacity-60"
            >
              {savingPrefs ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</> : 'Save preferences'}
            </button>
          </div>
        </section>

        {/* ── Security placeholder ─────────────────────────────────── */}
        <section className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2.5 px-6 py-4 border-b border-border">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Security</h2>
          </div>
          <div className="px-6 py-5">
            <Row label="Password">
              <a
                href="mailto:support@taskpay.in?subject=Password reset request"
                className="text-sm text-[#14a800] hover:underline"
              >
                Request password reset
              </a>
            </Row>
          </div>
        </section>

        {/* ── Danger Zone ─────────────────────────────────────────────── */}
        <section className="bg-card border border-red-900/50 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2.5 px-6 py-4 border-b border-red-100">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h2 className="text-sm font-semibold text-red-400">Danger Zone</h2>
          </div>
          <div className="px-6 py-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground">Delete account</p>
                <p className="text-sm text-muted-foreground mt-0.5 max-w-sm">
                  Permanently removes your profile, jobs, proposals, and messages.
                  Completed contract records are anonymised and kept for audit purposes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full border-2 border-red-500 text-red-600 text-sm font-semibold hover:bg-red-950/30 transition-colors flex-shrink-0 self-start sm:self-center"
              >
                <Trash2 className="w-4 h-4" />
                Delete Account
              </button>
            </div>
          </div>
        </section>

      </main>

      <Footer />

      {/* ── Delete confirmation modal ─────────────────────────────── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div
            className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
          >
            {/* Modal header */}
            <div className="flex items-start gap-4 px-6 pt-6 pb-5">
              <div className="w-10 h-10 rounded-full bg-red-950/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 id="delete-modal-title" className="text-base font-bold text-foreground">
                  Delete your TaskPay account?
                </h3>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  This is permanent and cannot be undone. The following will be deleted:
                </p>
                <ul className="mt-2.5 space-y-1">
                  {[
                    'Your profile and portfolio',
                    'All job postings and proposals',
                    'All messages and conversations',
                    'Reviews you have written',
                  ].map(item => (
                    <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="mt-2.5 text-sm text-muted-foreground leading-relaxed">
                  Completed contract records are anonymised and kept for financial audit purposes.
                </p>
              </div>
            </div>

            <div className="px-6 pb-6 border-t border-border pt-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Type <span className="font-mono font-bold text-red-600">{CONFIRM_PHRASE}</span> to confirm
                </label>
                <input
                  ref={confirmInputRef}
                  type="text"
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && canConfirm) handleDeleteAccount() }}
                  placeholder={CONFIRM_PHRASE}
                  className="w-full border border-border rounded-lg px-3.5 py-2.5 text-sm text-foreground placeholder:text-[var(--faint)] focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-200 transition-colors"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 rounded-full border border-border text-sm font-semibold text-foreground hover:bg-background transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={!canConfirm || deleting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-red-600 text-foreground text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {deleting
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting…</>
                    : <><Trash2 className="w-4 h-4" /> Yes, delete everything</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({
  label,
  children,
}: {
  label: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-muted-foreground flex-shrink-0">{label}</span>
      <div className="min-w-0 flex justify-end">{children}</div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Plus, CheckCircle2, Clock, AlertCircle, RotateCcw, DollarSign, Calendar } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

interface MilestoneData {
  id: string
  contract_id: string | null
  name: string
  description: string | null
  amount: number
  due_date: string | null
  status: string
  revision_count: number
  delivered_at: string | null
  approved_at: string | null
  created_at: string
}

interface Props {
  contractId: string
  milestones: MilestoneData[]
  isClient: boolean
  contractStatus: string
  onChange: (milestones: MilestoneData[]) => void
}

const STATUS_STYLES: Record<string, { label: string; icon: typeof CheckCircle2; bg: string; text: string }> = {
  pending: { label: 'Pending', icon: Clock, bg: 'bg-card', text: 'text-muted-foreground' },
  delivered: { label: 'Delivered', icon: CheckCircle2, bg: 'bg-blue-950/30', text: 'text-blue-400' },
  revision_requested: { label: 'Revision', icon: RotateCcw, bg: 'bg-orange-50', text: 'text-orange-600' },
  approved: { label: 'Approved', icon: CheckCircle2, bg: 'bg-[#14a800/20]', text: 'text-[#14a800]' },
  disputed: { label: 'Disputed', icon: AlertCircle, bg: 'bg-red-950/30', text: 'text-red-600' },
}

export default function MilestoneTracker({ contractId, milestones, isClient, contractStatus, onChange }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', amount: '', due_date: '' })
  const [submitting, setSubmitting] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)

  const totalAmount = milestones.reduce((s, m) => s + m.amount, 0)
  const approvedAmount = milestones.filter(m => m.status === 'approved').reduce((s, m) => s + m.amount, 0)
  const progressPct = totalAmount > 0 ? Math.round((approvedAmount / totalAmount) * 100) : 0

  const addMilestone = async () => {
    if (!form.name.trim() || !form.amount) return
    setSubmitting(true)
    const res = await fetch(`/api/contracts/${contractId}/milestones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      const m: MilestoneData = await res.json()
      onChange([...milestones, m])
      setForm({ name: '', description: '', amount: '', due_date: '' })
      setShowForm(false)
      toast.success('Milestone added')
    } else {
      const e = await res.json()
      toast.error(e.error ?? 'Failed to add milestone')
    }
    setSubmitting(false)
  }

  const updateMilestone = async (mid: string, status: string) => {
    setUpdating(mid)
    const res = await fetch(`/api/contracts/${contractId}/milestones/${mid}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      const updated: MilestoneData = await res.json()
      onChange(milestones.map(m => m.id === mid ? updated : m))
      const messages: Record<string, string> = {
        delivered: 'Milestone marked as delivered',
        approved: 'Milestone approved!',
        revision_requested: 'Revision requested',
      }
      toast.success(messages[status] ?? 'Milestone updated')
    } else {
      toast.error('Failed to update milestone')
    }
    setUpdating(null)
  }

  const canAddMilestone = isClient && contractStatus === 'active'

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-foreground">Milestones</h2>
        {canAddMilestone && !showForm && (
          <button onClick={() => setShowForm(true)} className="btn btn-secondary btn-sm gap-1">
            <Plus className="w-3.5 h-3.5" /> Add Milestone
          </button>
        )}
      </div>

      {/* Progress bar */}
      {milestones.length > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>{progressPct}% complete</span>
            <span>{formatCurrency(approvedAmount)} of {formatCurrency(totalAmount)} approved</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      )}

      {/* Milestone list */}
      <div className="space-y-3">
        {milestones.length === 0 && !showForm && (
          <p className="text-sm text-muted-foreground text-center py-4">
            {isClient ? 'Add milestones to break the project into deliverable chunks.' : 'No milestones yet.'}
          </p>
        )}

        {milestones.map((m) => {
          const cfg = STATUS_STYLES[m.status] ?? STATUS_STYLES.pending
          const StatusIcon = cfg.icon
          const isUpdating = updating === m.id

          return (
            <div key={m.id} className={cn('rounded-xl border border-border p-4', m.status === 'approved' && 'border-[#14a800]/30 bg-[#14a800/10]')}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn('flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full', cfg.bg, cfg.text)}>
                      <StatusIcon className="w-3 h-3" />
                      {cfg.label}
                    </span>
                    <span className="font-medium text-sm text-foreground truncate">{m.name}</span>
                  </div>
                  {m.description && (
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{m.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 font-semibold text-foreground">
                      <DollarSign className="w-3 h-3" />
                      {formatCurrency(m.amount)}
                    </span>
                    {m.due_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Due {new Date(m.due_date).toLocaleDateString()}
                      </span>
                    )}
                    {m.revision_count > 0 && (
                      <span className="flex items-center gap-1 text-orange-500">
                        <RotateCcw className="w-3 h-3" />
                        {m.revision_count} revision{m.revision_count !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              {contractStatus === 'active' && (
                <div className="flex gap-2 mt-3">
                  {!isClient && m.status === 'pending' && (
                    <button
                      onClick={() => updateMilestone(m.id, 'delivered')}
                      disabled={isUpdating}
                      className="btn btn-primary btn-sm gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Mark Delivered
                    </button>
                  )}
                  {!isClient && m.status === 'revision_requested' && (
                    <button
                      onClick={() => updateMilestone(m.id, 'delivered')}
                      disabled={isUpdating}
                      className="btn btn-primary btn-sm gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Resubmit
                    </button>
                  )}
                  {isClient && m.status === 'delivered' && (
                    <>
                      <button
                        onClick={() => updateMilestone(m.id, 'approved')}
                        disabled={isUpdating}
                        className="btn btn-primary btn-sm gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => updateMilestone(m.id, 'revision_requested')}
                        disabled={isUpdating}
                        className="btn btn-secondary btn-sm gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Request Revision
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add milestone form */}
      {showForm && (
        <div className="mt-4 rounded-xl border border-[#14a800]/30 bg-[#14a800/10] p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">New Milestone</h3>
          <div className="field">
            <label className="label">Name *</label>
            <input
              className="input"
              placeholder="e.g. Design mockups"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div className="field">
            <label className="label">Description</label>
            <textarea
              className="input resize-none"
              rows={2}
              placeholder="What will be delivered?"
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="field">
              <label className="label">Amount (₹) *</label>
              <input
                className="input"
                type="number"
                min="1"
                placeholder="5000"
                value={form.amount}
                onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
              />
            </div>
            <div className="field">
              <label className="label">Due Date</label>
              <input
                className="input"
                type="date"
                value={form.due_date}
                onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={addMilestone}
              disabled={submitting || !form.name.trim() || !form.amount}
              className="btn btn-primary btn-sm"
            >
              {submitting ? 'Adding…' : 'Add Milestone'}
            </button>
            <button onClick={() => setShowForm(false)} className="btn btn-ghost btn-sm">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

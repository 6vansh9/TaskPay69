'use client'

import { useState } from 'react'
import { AlertCircle, X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  contractId: string
  onDisputeRaised: () => void
  onClose: () => void
}

export default function DisputeModal({ contractId, onDisputeRaised, onClose }: Props) {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (reason.trim().length < 20) {
      toast.error('Please provide at least 20 characters describing the dispute.')
      return
    }
    setSubmitting(true)
    const res = await fetch('/api/disputes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contract_id: contractId, reason }),
    })
    if (res.ok) {
      toast.success('Dispute raised. Our team will review within 48 hours.')
      onDisputeRaised()
    } else {
      const e = await res.json()
      toast.error(e.error ?? 'Failed to raise dispute')
    }
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="card w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <h2 className="font-bold text-[#1d1d1d]">Raise a Dispute</h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost p-1.5 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-4">
          <p className="text-xs text-orange-700 leading-relaxed">
            <strong>Before raising a dispute:</strong> Try to resolve the issue directly with the other party via chat. Disputes put the contract on hold and involve admin review.
          </p>
        </div>

        <div className="field mb-4">
          <label className="label">Describe the issue *</label>
          <textarea
            className="input resize-none"
            rows={5}
            placeholder="Describe what went wrong, what was agreed, and what outcome you expect. Minimum 20 characters."
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
          <div className="text-xs text-[#6b6b6b] mt-1 text-right">{reason.length} / 1000</div>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="btn btn-ghost flex-1">Cancel</button>
          <button
            onClick={submit}
            disabled={submitting || reason.trim().length < 20}
            className="btn btn-danger flex-1 gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? 'Submitting…' : 'Raise Dispute'}
          </button>
        </div>
      </div>
    </div>
  )
}

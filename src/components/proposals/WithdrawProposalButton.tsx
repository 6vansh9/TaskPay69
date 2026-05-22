'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  proposalId: string
  jobId: string
}

export default function WithdrawProposalButton({ proposalId, jobId }: Props) {
  const router = useRouter()
  const [confirm, setConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  async function withdraw() {
    setLoading(true)
    try {
      const res = await fetch(`/api/proposals/${proposalId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Withdrawal failed'); setLoading(false); return }
      toast.success('Proposal withdrawn. Connects refunded.')
      router.refresh()
    } catch {
      toast.error('Network error')
      setLoading(false)
    }
  }

  if (!confirm) {
    return (
      <button
        onClick={() => setConfirm(true)}
        className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors mt-2"
      >
        <Trash2 className="w-3.5 h-3.5" /> Withdraw Proposal
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 mt-2">
      <span className="text-xs text-red-400">Withdraw and refund connects?</span>
      <button
        onClick={withdraw}
        disabled={loading}
        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/15 text-red-400 text-xs font-semibold hover:bg-red-500/25 transition-colors disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Yes, withdraw'}
      </button>
      <button
        onClick={() => setConfirm(false)}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        Cancel
      </button>
    </div>
  )
}

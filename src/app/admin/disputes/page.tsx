'use client'

import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/layout/Header'
import Link from 'next/link'
import { AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react'

interface Dispute {
  id: string
  reason: string
  created_at: string
  contract: { id: string; amount: number; job: { title: string } | null } | null
  raised_by_profile: { id: string; full_name: string; email: string } | null
}

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [loading, setLoading] = useState(true)

  const fetch_ = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/disputes')
    if (res.ok) setDisputes(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetch_() }, [fetch_])

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-yellow-500" />
            <h1 className="text-2xl font-bold text-gray-900">Open Disputes</h1>
            <span className="bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full px-2 py-0.5">{disputes.length}</span>
          </div>
          <button onClick={fetch_} className="btn btn-ghost btn-sm text-gray-500">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading…</div>
        ) : disputes.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-gray-500">No open disputes. All clear!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {disputes.map(d => (
              <div key={d.id} className="card p-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900 truncate">
                        {d.contract?.job?.title ?? 'Contract'}
                      </span>
                      {d.contract?.amount && (
                        <span className="text-sm text-gray-400">₹{d.contract.amount.toLocaleString()}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mb-1">
                      Raised by: <strong>{d.raised_by_profile?.full_name}</strong> ({d.raised_by_profile?.email})
                    </p>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 my-3">
                      <p className="text-sm text-yellow-800">{d.reason}</p>
                    </div>
                    <p className="text-xs text-gray-400">
                      {new Date(d.created_at).toLocaleString('en-IN')}
                    </p>
                  </div>
                  {d.contract?.id && (
                    <Link
                      href={`/contracts/${d.contract.id}`}
                      className="btn btn-primary btn-sm flex-shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Resolve
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

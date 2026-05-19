'use client'

import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/layout/Header'
import { Users, Search, Ban, AlertTriangle, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

interface AdminUser {
  id: string
  full_name: string
  email: string
  role: string
  is_banned: boolean
  phone_verified: boolean
  edu_verified: boolean
  created_at: string
  jobs_completed: number
  total_earnings: number
  warned_at: string | null
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchUsers = useCallback(async (q = '') => {
    setLoading(true)
    const res = await fetch(`/api/admin/users?search=${encodeURIComponent(q)}`)
    if (res.ok) { const d = await res.json(); setUsers(d.users); setTotal(d.total) }
    setLoading(false)
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  async function action(userId: string, act: string, notes?: string) {
    setActionLoading(`${userId}-${act}`)
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: act, admin_notes: notes }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error) }
    else { toast.success('Done'); fetchUsers(search) }
    setActionLoading(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <span className="text-sm text-gray-400">{total} total</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => { setSearch(e.target.value); fetchUsers(e.target.value) }}
            className="input pl-10 w-full max-w-md"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="pb-3 pr-4 font-medium">User</th>
                <th className="pb-3 pr-4 font-medium">Role</th>
                <th className="pb-3 pr-4 font-medium">Verified</th>
                <th className="pb-3 pr-4 font-medium">Status</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={5} className="py-8 text-center text-gray-400">Loading…</td></tr>
              ) : users.map(u => (
                <tr key={u.id} className={cn('hover:bg-gray-50', u.is_banned && 'opacity-50')}>
                  <td className="py-3 pr-4">
                    <div className="font-medium text-gray-900">{u.full_name}</div>
                    <div className="text-gray-400 text-xs">{u.email}</div>
                  </td>
                  <td className="py-3 pr-4 capitalize">
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-medium',
                      u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                      u.role === 'client' ? 'bg-blue-100 text-blue-700' :
                      'bg-green-100 text-green-700'
                    )}>{u.role}</span>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex gap-1 flex-wrap">
                      {u.phone_verified && (
                        <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs">Phone</span>
                      )}
                      {u.edu_verified && (
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">Edu</span>
                      )}
                      {!u.phone_verified && !u.edu_verified && (
                        <span className="text-xs text-gray-400">None</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    {u.is_banned ? (
                      <span className="text-xs text-red-600 font-medium">Banned</span>
                    ) : u.warned_at ? (
                      <span className="text-xs text-yellow-600 font-medium">Warned</span>
                    ) : (
                      <span className="text-xs text-green-600">Active</span>
                    )}
                  </td>
                  <td className="py-3">
                    <div className="flex gap-1 flex-wrap">
                      {!u.phone_verified && (
                        <button
                          onClick={() => action(u.id, 'verify_phone')}
                          disabled={actionLoading === `${u.id}-verify_phone`}
                          className="btn btn-xs bg-green-50 text-green-700 hover:bg-green-100 rounded px-2 py-1 text-xs"
                          title="Manually verify phone"
                        >
                          <ShieldCheck className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={() => action(u.id, 'warn', 'Violation of platform guidelines.')}
                        disabled={actionLoading === `${u.id}-warn`}
                        className="btn btn-xs bg-yellow-50 text-yellow-700 hover:bg-yellow-100 rounded px-2 py-1 text-xs"
                        title="Warn user"
                      >
                        <AlertTriangle className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => action(u.id, u.is_banned ? 'unban' : 'ban')}
                        disabled={actionLoading === `${u.id}-ban` || actionLoading === `${u.id}-unban`}
                        className={cn(
                          'btn btn-xs rounded px-2 py-1 text-xs',
                          u.is_banned
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            : 'bg-red-50 text-red-700 hover:bg-red-100'
                        )}
                        title={u.is_banned ? 'Unban user' : 'Ban user'}
                      >
                        <Ban className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}

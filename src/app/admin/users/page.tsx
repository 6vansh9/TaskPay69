'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Users, Search, Ban, AlertTriangle, ShieldCheck, ExternalLink, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { timeAgo } from '@/lib/utils'

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
  avatar_url: string | null
}

type RoleFilter = 'all' | 'client' | 'freelancer' | 'banned'

const ROLE_FILTERS: { value: RoleFilter; label: string }[] = [
  { value: 'all',        label: 'All'         },
  { value: 'client',     label: 'Clients'     },
  { value: 'freelancer', label: 'Freelancers' },
  { value: 'banned',     label: 'Banned'      },
]

export default function AdminUsersPage() {
  const [users, setUsers]           = useState<AdminUser[]>([])
  const [total, setTotal]           = useState(0)
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchUsers = useCallback(async (q = search, rf = roleFilter) => {
    setLoading(true)
    const params = new URLSearchParams({ search: q, role: rf })
    const res = await fetch(`/api/admin/users?${params}`)
    if (res.ok) {
      const d = await res.json()
      setUsers(d.users)
      setTotal(d.total)
    }
    setLoading(false)
  }, [search, roleFilter])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  async function action(userId: string, act: string, notes?: string) {
    setActionLoading(`${userId}-${act}`)
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: act, admin_notes: notes }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error ?? 'Failed') }
    else { toast.success('Done'); fetchUsers() }
    setActionLoading(null)
  }

  function getInitials(name: string) {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-[#14a800]" />
          <h1 className="text-2xl font-bold text-foreground">Users</h1>
          <span className="text-sm text-[var(--faint)]">{total} total</span>
        </div>
        <button onClick={() => fetchUsers()} className="btn btn-ghost btn-sm text-muted-foreground gap-1.5">
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Filter row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--faint)]" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => { setSearch(e.target.value); fetchUsers(e.target.value, roleFilter) }}
            className="input pl-10 w-full"
          />
        </div>
        <div className="flex gap-1 bg-background rounded-xl p-1 border border-[var(--muted)]">
          {ROLE_FILTERS.map(({ value, label }) => (
            <button key={value} onClick={() => { setRoleFilter(value); fetchUsers(search, value) }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                roleFilter === value ? 'bg-muted text-foreground' : 'text-[var(--faint)] hover:text-foreground'
              )}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">User</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">Role</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">Verified</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">Joined</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">Status</th>
                <th className="px-5 py-3 text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--card)]">
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-[var(--faint)]">Loading…</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-[var(--faint)]">No users found</td></tr>
              ) : users.map(u => (
                <tr key={u.id} className={cn('hover:bg-background transition-colors', u.is_banned && 'opacity-60')}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {u.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={u.avatar_url} width={32} height={32} alt={u.full_name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-muted-foreground">{getInitials(u.full_name ?? 'U')}</span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-medium text-foreground truncate">{u.full_name}</div>
                        <div className="text-[var(--faint)] text-xs truncate">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-medium capitalize',
                      u.role === 'admin'      ? 'bg-purple-950/50 text-purple-400' :
                      u.role === 'client'     ? 'bg-blue-950/50 text-blue-400' :
                      u.role === 'freelancer' ? 'bg-[#14a800]/15 text-[#4ade80]' : 'bg-muted text-muted-foreground'
                    )}>{u.role}</span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {u.phone_verified && <span className="px-1.5 py-0.5 bg-[#14a800]/15 text-[#4ade80] rounded text-xs">Phone</span>}
                      {u.edu_verified   && <span className="px-1.5 py-0.5 bg-blue-950/50 text-blue-400 rounded text-xs">Edu</span>}
                      {!u.phone_verified && !u.edu_verified && <span className="text-xs text-[var(--faint)]">None</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs text-[var(--faint)] whitespace-nowrap">{timeAgo(u.created_at)}</td>
                  <td className="px-5 py-3">
                    {u.is_banned ? (
                      <span className="text-xs text-red-400 font-medium">Banned</span>
                    ) : u.warned_at ? (
                      <span className="text-xs text-yellow-400 font-medium">Warned</span>
                    ) : (
                      <span className="text-xs text-[#4ade80]">Active</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-1.5 flex-wrap">
                      <Link href={`/profile/${u.id}`} target="_blank"
                        className="btn btn-xs rounded-lg px-2 py-1 text-xs bg-muted text-muted-foreground hover:text-foreground border border-border"
                        title="View profile">
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                      {!u.phone_verified && (
                        <button onClick={() => action(u.id, 'verify_phone')}
                          disabled={actionLoading === `${u.id}-verify_phone`}
                          className="btn btn-xs rounded-lg px-2 py-1 text-xs bg-[#14a800]/10 text-[#4ade80] hover:bg-[#14a800]/20"
                          title="Verify phone">
                          <ShieldCheck className="w-3 h-3" />
                        </button>
                      )}
                      {!u.edu_verified && (
                        <button onClick={() => action(u.id, 'verify_edu')}
                          disabled={actionLoading === `${u.id}-verify_edu`}
                          className="btn btn-xs rounded-lg px-2 py-1 text-xs bg-blue-950/30 text-blue-400 hover:bg-blue-950/50"
                          title="Verify edu">
                          <ShieldCheck className="w-3 h-3" />
                        </button>
                      )}
                      <button onClick={() => action(u.id, 'warn', 'Violation of platform guidelines.')}
                        disabled={actionLoading === `${u.id}-warn`}
                        className="btn btn-xs rounded-lg px-2 py-1 text-xs bg-yellow-950/30 text-yellow-400 hover:bg-yellow-950/50"
                        title="Warn user">
                        <AlertTriangle className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => action(u.id, u.is_banned ? 'unban' : 'ban')}
                        disabled={actionLoading === `${u.id}-ban` || actionLoading === `${u.id}-unban`}
                        className={cn(
                          'btn btn-xs rounded-lg px-2 py-1 text-xs',
                          u.is_banned ? 'bg-muted text-foreground/80 hover:bg-muted border border-border' : 'bg-red-950/30 text-red-400 hover:bg-red-950/50'
                        )}
                        title={u.is_banned ? 'Unban' : 'Ban'}>
                        <Ban className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

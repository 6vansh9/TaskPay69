'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, X, Loader2, Briefcase } from 'lucide-react'
import toast from 'react-hot-toast'

export interface WorkEntry {
  id: string
  company: string
  title: string
  from_year: string
  to_year: string
  description?: string
}

const YEARS = Array.from({ length: 2026 - 1990 + 1 }, (_, i) => String(2026 - i))

const emptyEntry = (): WorkEntry => ({
  id: crypto.randomUUID(),
  company: '', title: '', from_year: '', to_year: 'Present', description: '',
})

export default function WorkHistorySection({
  initialEntries,
  showEdit,
}: {
  initialEntries: WorkEntry[]
  showEdit: boolean
}) {
  const [entries, setEntries] = useState<WorkEntry[]>(initialEntries)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<WorkEntry>(emptyEntry())
  const [saving, setSaving] = useState(false)

  function openNew() { setEditing(emptyEntry()); setOpen(true) }
  function openEdit(e: WorkEntry) { setEditing({ ...e }); setOpen(true) }

  async function save() {
    if (!editing.company.trim() || !editing.title.trim() || !editing.from_year) {
      toast.error('Company, title, and start year are required.')
      return
    }
    setSaving(true)
    const updated = entries.find(e => e.id === editing.id)
      ? entries.map(e => e.id === editing.id ? editing : e)
      : [...entries, editing]
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ work_history: updated }),
    })
    setSaving(false)
    if (!res.ok) { const d = await res.json(); toast.error(d.error ?? 'Save failed'); return }
    setEntries(updated)
    setOpen(false)
    toast.success('Work history updated!')
  }

  async function remove(id: string) {
    const updated = entries.filter(e => e.id !== id)
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ work_history: updated }),
    })
    if (!res.ok) { toast.error('Failed to delete'); return }
    setEntries(updated)
    toast.success('Entry removed')
  }

  const inputCls = 'w-full border border-border rounded-lg px-3.5 py-2.5 text-sm text-foreground placeholder:text-[var(--faint)] focus:border-[#14a800] focus:outline-none focus:ring-2 focus:ring-[#14a800]/10 transition-colors bg-background'

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-foreground">Work experience</h2>
        {showEdit && (
          <button type="button" onClick={openNew}
            className="flex items-center gap-1 text-sm text-[#14a800] hover:text-[#0f7a00] font-medium transition-colors">
            <Plus className="w-4 h-4" /> Add
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-[var(--faint)]">
          {showEdit ? 'Add your past work experience to stand out.' : 'No work experience listed.'}
        </p>
      ) : (
        <div className="space-y-5">
          {entries.map((entry, i) => (
            <div key={entry.id} className={i > 0 ? 'pt-5 border-t border-border' : ''}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-muted border border-border flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Briefcase className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{entry.title}</p>
                    <p className="text-sm text-muted-foreground">{entry.company}</p>
                    <p className="text-xs text-[var(--faint)] mt-0.5">
                      {entry.from_year} – {entry.to_year}
                    </p>
                    {entry.description && (
                      <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{entry.description}</p>
                    )}
                  </div>
                </div>
                {showEdit && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button type="button" onClick={() => openEdit(entry)}
                      className="p-1.5 rounded-lg text-[var(--faint)] hover:text-foreground hover:bg-muted transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => remove(entry.id)}
                      className="p-1.5 rounded-lg text-[var(--faint)] hover:text-red-400 hover:bg-muted transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">
                {entries.find(e => e.id === editing.id) ? 'Edit experience' : 'Add experience'}
              </h3>
              <button type="button" onClick={() => setOpen(false)} className="text-[var(--faint)] hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1.5">Job title *</label>
                <input className={inputCls} value={editing.title}
                  onChange={e => setEditing(v => ({ ...v, title: e.target.value }))}
                  placeholder="e.g. Senior Software Engineer" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1.5">Company *</label>
                <input className={inputCls} value={editing.company}
                  onChange={e => setEditing(v => ({ ...v, company: e.target.value }))}
                  placeholder="e.g. Infosys, Startup.io" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1.5">From year *</label>
                  <select className={inputCls} value={editing.from_year}
                    onChange={e => setEditing(v => ({ ...v, from_year: e.target.value }))}>
                    <option value="">Select…</option>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1.5">To year</label>
                  <select className={inputCls} value={editing.to_year}
                    onChange={e => setEditing(v => ({ ...v, to_year: e.target.value }))}>
                    <option value="Present">Present</option>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                  Description <span className="text-[var(--faint)] font-normal">(optional)</span>
                </label>
                <textarea className={`${inputCls} resize-none`} rows={3} value={editing.description ?? ''}
                  onChange={e => setEditing(v => ({ ...v, description: e.target.value }))}
                  placeholder="What did you work on? Key achievements…" maxLength={400} />
              </div>
            </div>
            <div className="flex gap-3 px-5 py-4 border-t border-border">
              <button type="button" onClick={() => setOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-background transition-colors">
                Cancel
              </button>
              <button type="button" onClick={save} disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-[#14a800] text-sm font-semibold text-foreground hover:bg-[#0f7a00] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

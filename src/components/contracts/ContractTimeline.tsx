'use client'

import {
  CheckCircle2, Clock, Circle, RotateCcw, AlertCircle,
  XCircle, Calendar,
} from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'

interface MilestoneData {
  id: string
  name: string
  description: string | null
  amount: number
  due_date: string | null
  status: string
  delivered_at: string | null
  approved_at: string | null
  created_at: string
}

interface Props {
  milestones: MilestoneData[]
  contractStatus: string
  contractCreatedAt: string
  contractAmount: number
}

type NodeStatus = 'done' | 'active' | 'delivered' | 'revision' | 'disputed' | 'cancelled' | 'future'

const NODE: Record<NodeStatus, {
  Icon: typeof CheckCircle2
  ring: string; nodeBg: string; iconCls: string; textCls: string
  cardBorder: string; cardBg: string; badge: string
}> = {
  done:      { Icon: CheckCircle2, ring: 'ring-[#14a800]',     nodeBg: 'bg-[#14a800]',    iconCls: 'text-white',           textCls: 'text-[#14a800]',       cardBorder: 'border-[#14a800]/25',  cardBg: 'bg-[#14a800]/[.04]',    badge: 'Approved'    },
  active:    { Icon: Clock,        ring: 'ring-amber-400',      nodeBg: 'bg-amber-400',    iconCls: 'text-white',           textCls: 'text-amber-400',       cardBorder: 'border-amber-400/35',  cardBg: 'bg-amber-400/[.05]',    badge: 'In Progress' },
  delivered: { Icon: CheckCircle2, ring: 'ring-blue-400',       nodeBg: 'bg-blue-400',     iconCls: 'text-white',           textCls: 'text-blue-400',        cardBorder: 'border-blue-400/35',   cardBg: 'bg-blue-400/[.05]',     badge: 'Delivered'   },
  revision:  { Icon: RotateCcw,    ring: 'ring-orange-400',     nodeBg: 'bg-orange-400',   iconCls: 'text-white',           textCls: 'text-orange-400',      cardBorder: 'border-orange-400/35', cardBg: 'bg-orange-400/[.05]',   badge: 'Revision'    },
  disputed:  { Icon: AlertCircle,  ring: 'ring-red-400',        nodeBg: 'bg-red-400',      iconCls: 'text-white',           textCls: 'text-red-400',         cardBorder: 'border-red-400/35',    cardBg: 'bg-red-400/[.05]',      badge: 'Disputed'    },
  cancelled: { Icon: XCircle,      ring: 'ring-red-400/50',     nodeBg: 'bg-red-400/20',   iconCls: 'text-red-400',         textCls: 'text-red-400',         cardBorder: 'border-red-400/25',    cardBg: 'bg-red-400/[.04]',      badge: 'Cancelled'   },
  future:    { Icon: Circle,       ring: 'ring-border',         nodeBg: 'bg-card',         iconCls: 'text-[var(--faint)]',  textCls: 'text-muted-foreground',cardBorder: 'border-border',        cardBg: 'bg-transparent',        badge: 'Pending'     },
}

// Ping overlay colour per status (inline style — avoids Tailwind purge of dynamic classes)
const PING_COLOR: Partial<Record<NodeStatus, string>> = {
  active:    'rgba(251,191,36,0.25)',
  delivered: 'rgba(96,165,250,0.25)',
  revision:  'rgba(251,146,60,0.25)',
  disputed:  'rgba(248,113,113,0.25)',
}

function msNode(ms: MilestoneData, i: number, activeIdx: number): NodeStatus {
  if (ms.status === 'approved')         return 'done'
  if (activeIdx === -1 || i > activeIdx) return 'future'
  if (ms.status === 'delivered')         return 'delivered'
  if (ms.status === 'revision_requested') return 'revision'
  if (ms.status === 'disputed')          return 'disputed'
  return 'active'
}

export default function ContractTimeline({
  milestones, contractStatus, contractCreatedAt, contractAmount,
}: Props) {
  const approvedCount = milestones.filter(m => m.status === 'approved').length
  const activeIdx     = milestones.findIndex(m => m.status !== 'approved')
  const hasMilestones = milestones.length > 0

  // ── Progress ───────────────────────────────────────────────────────
  let pct: number
  let progressSub: string
  if (hasMilestones) {
    pct = Math.round((approvedCount / milestones.length) * 100)
    progressSub = `${approvedCount} of ${milestones.length} milestone${milestones.length !== 1 ? 's' : ''} approved`
  } else {
    const map: Record<string, number> = {
      pending: 10, active: 30, delivered: 75, complete: 100, disputed: 50, cancelled: 0,
    }
    pct = map[contractStatus] ?? 0
    progressSub = contractStatus === 'complete' ? 'Contract complete' : `Contract ${contractStatus}`
  }

  // ── Build steps ────────────────────────────────────────────────────
  interface Step {
    id: string; ns: NodeStatus; label: string
    sub?: string | null; date?: string; amount?: number
  }

  let steps: Step[]

  if (hasMilestones) {
    steps = milestones.map((m, i) => {
      const ns   = msNode(m, i, activeIdx)
      const date = m.approved_at
        ? `Approved ${new Date(m.approved_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
        : m.delivered_at
        ? `Delivered ${new Date(m.delivered_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
        : m.due_date
        ? `Due ${new Date(m.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
        : undefined
      return { id: m.id, ns, label: m.name, sub: m.description, date, amount: m.amount }
    })
  } else {
    // Contract lifecycle steps
    const ORDER = ['pending', 'active', 'delivered', 'complete'] as const
    type OrderKey = typeof ORDER[number]
    const curIdx = ORDER.indexOf(contractStatus as OrderKey)
    const createdDate = new Date(contractCreatedAt).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    })

    if (contractStatus === 'cancelled') {
      steps = [
        { id: 'created',   ns: 'done',      label: 'Contract Created',  date: createdDate },
        { id: 'active',    ns: 'done',      label: 'Work in Progress'  },
        { id: 'cancelled', ns: 'cancelled', label: 'Contract Cancelled' },
      ]
    } else if (contractStatus === 'disputed') {
      steps = [
        { id: 'created',   ns: 'done',     label: 'Contract Created', date: createdDate },
        { id: 'active',    ns: 'done',     label: 'Work in Progress' },
        { id: 'disputed',  ns: 'disputed', label: 'Dispute In Progress' },
        { id: 'resolve',   ns: 'future',   label: 'Pending Resolution' },
      ]
    } else {
      const lifecycle: { id: string; label: string; amount?: number; date?: string }[] = [
        { id: 'pending',   label: 'Contract Created',  date: createdDate },
        { id: 'active',    label: 'Work in Progress'  },
        { id: 'delivered', label: 'Work Submitted'    },
        { id: 'complete',  label: 'Payment Released',  amount: contractAmount },
      ]
      steps = lifecycle.map(s => {
        const sIdx = ORDER.indexOf(s.id as OrderKey)
        let ns: NodeStatus
        if (contractStatus === 'complete' && s.id === 'complete') ns = 'done'
        else if (sIdx < curIdx)     ns = 'done'
        else if (sIdx === curIdx)   ns = 'active'
        else                        ns = 'future'
        return { ...s, ns }
      })
    }
  }

  return (
    <div className="card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-foreground">Contract Timeline</h2>
        <span className={cn(
          'text-xs font-bold px-2.5 py-1 rounded-full',
          pct === 100
            ? 'bg-[#14a800]/15 text-[#14a800]'
            : 'bg-muted text-muted-foreground',
        )}>
          {pct}% complete
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${pct}%`,
              background: pct === 100
                ? '#14a800'
                : 'linear-gradient(90deg,#14a800 0%,#22c55e 100%)',
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">{progressSub}</p>
      </div>

      {/* Steps */}
      <div className="relative">
        {/* Vertical track */}
        <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-border" aria-hidden="true" />

        <div className="space-y-0">
          {steps.map((step, idx) => {
            const cfg    = NODE[step.ns]
            const Icon   = cfg.Icon
            const isLast = idx === steps.length - 1
            const pingColor = PING_COLOR[step.ns]

            return (
              <div key={step.id} className={cn('relative flex items-start gap-3', !isLast && 'pb-4')}>

                {/* ── Node ── */}
                <div className={cn(
                  'relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ring-2',
                  cfg.ring, cfg.nodeBg,
                )}>
                  <Icon className={cn('w-4 h-4', cfg.iconCls)} />
                  {pingColor && (
                    <span
                      className="absolute inset-0 rounded-full animate-ping pointer-events-none"
                      style={{ backgroundColor: pingColor }}
                    />
                  )}
                </div>

                {/* ── Content card ── */}
                <div className={cn(
                  'flex-1 min-w-0 rounded-xl border px-3.5 py-2.5 transition-all',
                  cfg.cardBorder, cfg.cardBg,
                )}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {/* Label + status badge */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn(
                          'text-sm font-semibold leading-snug',
                          step.ns === 'future' ? 'text-muted-foreground' : 'text-foreground',
                        )}>
                          {step.label}
                        </span>
                        <span className={cn('text-[10px] font-bold uppercase tracking-wide', cfg.textCls)}>
                          {cfg.badge}
                        </span>
                      </div>

                      {/* Description (milestones) */}
                      {step.sub && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {step.sub}
                        </p>
                      )}

                      {/* Date */}
                      {step.date && (
                        <p className="flex items-center gap-1 text-xs text-[var(--faint)] mt-1">
                          <Calendar className="w-3 h-3 flex-shrink-0" />
                          {step.date}
                        </p>
                      )}
                    </div>

                    {/* Amount */}
                    {step.amount != null && step.amount > 0 && (
                      <span className={cn(
                        'text-sm font-bold flex-shrink-0',
                        step.ns === 'future' ? 'text-muted-foreground' : cfg.textCls,
                      )}>
                        {formatCurrency(step.amount)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

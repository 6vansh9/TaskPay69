'use client'

import { useState } from 'react'
import { X, Star } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  contractId: string
  revieweeName: string
  onClose: () => void
  onSubmitted: () => void
}

function StarPicker({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground w-36 flex-shrink-0">{label}</span>
      <div className="flex gap-1">
        {[1,2,3,4,5].map(s => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            onMouseEnter={() => setHover(s)}
            onMouseLeave={() => setHover(0)}
            className="p-0.5"
          >
            <Star
              className={`w-5 h-5 ${(hover || value) >= s ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
            />
          </button>
        ))}
      </div>
    </div>
  )
}

export default function ReviewModal({ contractId, revieweeName, onClose, onSubmitted }: Props) {
  const [rating, setRating] = useState(0)
  const [qualityRating, setQualityRating] = useState(0)
  const [commRating, setCommRating] = useState(0)
  const [deadlineRating, setDeadlineRating] = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit() {
    if (rating === 0) { toast.error('Please select an overall rating'); return }
    if (comment.trim().length < 10) { toast.error('Comment must be at least 10 characters'); return }
    setLoading(true)
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contract_id: contractId,
        rating,
        comment,
        quality_rating: qualityRating || null,
        communication_rating: commRating || null,
        deadline_rating: deadlineRating || null,
      }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { toast.error(data.error); return }
    toast.success('Review submitted!')
    onSubmitted()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-[var(--muted)]">
          <h2 className="font-semibold text-foreground">Review {revieweeName}</h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm p-1.5"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-5">
          {/* Overall */}
          <div>
            <p className="text-sm font-medium text-foreground/80 mb-2">Overall Rating</p>
            <div className="flex gap-2">
              {[1,2,3,4,5].map(s => (
                <button key={s} type="button" onClick={() => setRating(s)}>
                  <Star className={`w-8 h-8 ${rating >= s ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                </button>
              ))}
            </div>
          </div>

          {/* Sub-ratings */}
          <div className="space-y-2 border-t border-[var(--muted)] pt-4">
            <StarPicker value={qualityRating} onChange={setQualityRating} label="Work Quality" />
            <StarPicker value={commRating} onChange={setCommRating} label="Communication" />
            <StarPicker value={deadlineRating} onChange={setDeadlineRating} label="Deadlines" />
          </div>

          {/* Comment */}
          <div>
            <label className="text-sm font-medium text-foreground/80 block mb-1">Your Review</label>
            <textarea
              rows={4}
              placeholder="Share your experience working with this person…"
              value={comment}
              onChange={e => setComment(e.target.value)}
              className="input w-full resize-none"
            />
            <p className="text-xs text-[var(--faint)] mt-1">{comment.length}/500, minimum 10 characters</p>
          </div>

          <button onClick={submit} disabled={loading || rating === 0} className="btn btn-primary w-full">
            {loading ? 'Submitting…' : 'Submit Review'}
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { CardSkeleton } from '@/components/ui/Skeleton'

interface Review {
  id: string
  rating: number
  comment: string
  created_at: string
  quality_rating?: number
  communication_rating?: number
  deadline_rating?: number
  reviewer: { id: string; full_name: string; avatar_url?: string; role: string } | null
}

function StarRow({ value }: { value: number }) {
  return (
    <span className="flex gap-0.5">
      {[1,2,3,4,5].map(s => (
        <Star key={s} className={`w-3.5 h-3.5 ${value >= s ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
      ))}
    </span>
  )
}

export default function ReviewList({ revieweeId }: { revieweeId: string }) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/reviews?reviewee_id=${revieweeId}`)
      .then(r => r.json())
      .then(data => { setReviews(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [revieweeId])

  if (loading) return (
    <div className="space-y-4">
      {[1,2].map(i => <CardSkeleton key={i} />)}
    </div>
  )

  if (reviews.length === 0) return (
    <p className="text-gray-400 text-sm py-8 text-center">No reviews yet.</p>
  )

  return (
    <div className="space-y-4">
      {reviews.map(r => (
        <div key={r.id} className="card p-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm flex-shrink-0">
              {r.reviewer?.full_name?.[0] ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm text-gray-900">{r.reviewer?.full_name ?? 'Anonymous'}</span>
                <StarRow value={r.rating} />
                <span className="text-xs text-gray-400 capitalize">{r.reviewer?.role}</span>
              </div>
              <p className="text-sm text-gray-600 mt-2 leading-relaxed">{r.comment}</p>

              {(r.quality_rating || r.communication_rating || r.deadline_rating) && (
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                  {r.quality_rating && <span>Quality: <StarRow value={r.quality_rating} /></span>}
                  {r.communication_rating && <span>Communication: <StarRow value={r.communication_rating} /></span>}
                  {r.deadline_rating && <span>Deadlines: <StarRow value={r.deadline_rating} /></span>}
                </div>
              )}

              <p className="text-xs text-gray-400 mt-2">
                {new Date(r.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

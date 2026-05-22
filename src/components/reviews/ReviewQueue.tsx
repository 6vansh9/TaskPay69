'use client'

import { useState } from 'react'
import ReviewModal from './ReviewModal'

export interface PendingReview {
  contractId: string
  revieweeName: string
}

export default function ReviewQueue({ pending }: { pending: PendingReview[] }) {
  const [queue, setQueue] = useState<PendingReview[]>(pending)

  if (queue.length === 0) return null

  const current = queue[0]
  const advance = () => setQueue(q => q.slice(1))

  return (
    <ReviewModal
      contractId={current.contractId}
      revieweeName={current.revieweeName}
      onClose={advance}
      onSubmitted={advance}
    />
  )
}

'use client'

import { useState } from 'react'

export default function ExpandableBio({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  const LIMIT = 300
  const isLong = text.length > LIMIT

  return (
    <div>
      <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
        {isLong && !expanded ? text.slice(0, LIMIT) + '...' : text}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="text-sm text-[#14a800] font-medium mt-1.5 hover:underline"
        >
          {expanded ? 'less' : 'more'}
        </button>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, ExternalLink, ChevronLeft, ChevronRight, ZoomIn, Briefcase, Plus } from 'lucide-react'
import Link from 'next/link'

interface PortfolioItem {
  title: string
  description?: string
  url?: string
  image_url?: string
}

export default function PortfolioLightbox({
  items,
  showEdit,
}: {
  items: PortfolioItem[]
  showEdit?: boolean
}) {
  const [active, setActive] = useState<number | null>(null)

  const close  = useCallback(() => setActive(null), [])
  const prev   = useCallback(() => setActive(i => i !== null ? (i - 1 + items.length) % items.length : null), [items.length])
  const next   = useCallback(() => setActive(i => i !== null ? (i + 1) % items.length : null), [items.length])

  useEffect(() => {
    if (active === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey) }
  }, [active, close, prev, next])

  const cur = active !== null ? items[active] : null

  if (items.length === 0) {
    return (
      <div className="text-center py-10">
        <div className="w-16 h-16 mx-auto mb-3 opacity-30">
          <svg viewBox="0 0 64 64" className="w-full h-full fill-[var(--faint)]">
            <path d="M56 14H42l-4-6H26l-4 6H8a4 4 0 0 0-4 4v32a4 4 0 0 0 4 4h48a4 4 0 0 0 4-4V18a4 4 0 0 0-4-4z" opacity=".3"/>
            <circle cx="32" cy="34" r="10"/>
          </svg>
        </div>
        <p className="text-sm text-muted-foreground">No portfolio items yet.</p>
        {showEdit && (
          <>
            <p className="text-xs text-[var(--faint)] mt-1 mb-3">Talent are hired 9× more often with a portfolio.</p>
            <Link href="/profile/edit" className="text-sm text-[#14a800] font-medium hover:underline">Add a project</Link>
          </>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((item, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActive(i)}
            className="group border border-border rounded-xl overflow-hidden hover:border-[#14a800]/50 hover:shadow-md transition-all text-left w-full"
          >
            {item.image_url ? (
              <div className="relative overflow-hidden bg-muted">
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="w-full h-32 object-cover group-hover:scale-[1.04] transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-colors flex items-center justify-center">
                  <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                </div>
              </div>
            ) : (
              <div className="w-full h-32 bg-muted flex items-center justify-center">
                <Briefcase className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
            <div className="p-3">
              <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
              {item.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
              )}
              {item.url && (
                <p className="text-xs text-[#14a800] mt-1.5 truncate">
                  {item.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                </p>
              )}
            </div>
          </button>
        ))}

        {showEdit && (
          <Link
            href="/profile/edit"
            className="flex flex-col items-center justify-center gap-2 border border-dashed border-border rounded-xl h-[calc(32px+theme(spacing.3)*2+theme(spacing.16))] min-h-[148px] text-muted-foreground hover:border-[#14a800]/50 hover:text-[#14a800] transition-colors"
          >
            <Plus className="w-6 h-6" />
            <span className="text-xs font-medium">Add project</span>
          </Link>
        )}
      </div>

      {/* Lightbox overlay */}
      {active !== null && cur && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/88 backdrop-blur-sm p-4"
          onClick={close}
        >
          <div
            className="relative max-w-3xl w-full bg-card border border-border rounded-2xl overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={close}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Image */}
            {cur.image_url && (
              <div className="bg-black flex items-center justify-center max-h-[55vh] overflow-hidden">
                <img
                  src={cur.image_url}
                  alt={cur.title}
                  className="w-full max-h-[55vh] object-contain"
                />
              </div>
            )}

            {/* Info */}
            <div className="px-6 py-5">
              <h3 className="text-lg font-bold text-foreground">{cur.title}</h3>
              {cur.description && (
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{cur.description}</p>
              )}
              {cur.url && (
                <a
                  href={cur.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm text-[#14a800] hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View live project
                </a>
              )}
            </div>

            {/* Prev / Next arrows */}
            {items.length > 1 && (
              <>
                <button
                  onClick={e => { e.stopPropagation(); prev() }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                  aria-label="Previous"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); next() }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                  aria-label="Next"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                {/* Dot indicators */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                  {items.map((_, i) => (
                    <button
                      key={i}
                      onClick={e => { e.stopPropagation(); setActive(i) }}
                      className={`rounded-full transition-all ${i === active ? 'w-4 h-1.5 bg-[#14a800]' : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/60'}`}
                      aria-label={`Go to item ${i + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

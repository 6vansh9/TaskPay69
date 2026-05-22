'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <html lang="en">
      <body style={{ background: '#0a0a0a', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center', padding: '0 1rem', maxWidth: 400 }}>
          <p style={{ color: '#14A800', fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>TaskPay</p>
          <h1 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            Critical error
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            Something went wrong at the app level.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              onClick={reset}
              style={{ padding: '0.625rem 1.25rem', borderRadius: 12, background: '#14a800', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{ padding: '0.625rem 1.25rem', borderRadius: 12, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '0.875rem' }}
            >
              Go home
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}

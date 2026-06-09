'use client'

import { useEffect } from 'react'

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[app-error]', error.digest ?? error.message, error)
  }, [error])

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-5 px-4 py-20 text-center" style={{ background: 'var(--bg)' }}>
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
        style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.15)' }}>
        ⚠️
      </div>
      <div>
        <p className="text-base font-bold" style={{ color: 'var(--tx)' }}>משהו השתבש</p>
        <p className="mt-1 text-sm" style={{ color: 'var(--tx3)' }}>אירעה שגיאה בטעינת הדף.</p>
        {error.digest && (
          <p className="mt-2 rounded-lg px-3 py-1 text-xs font-mono" style={{ background: 'var(--s1)', color: 'var(--tx3)', border: '1px solid var(--bd)', display: 'inline-block' }}>
            {error.digest}
          </p>
        )}
      </div>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-xl px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
        >
          נסה שוב
        </button>
        <a
          href="/dashboard"
          className="rounded-xl border px-5 py-2.5 text-sm font-semibold transition hover:opacity-80"
          style={{ borderColor: 'var(--bd)', color: 'var(--tx2)' }}
        >
          לדף הבית
        </a>
      </div>
    </div>
  )
}

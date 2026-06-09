'use client'

import { useEffect } from 'react'

export default function AuthError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[auth-error]', error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-4 text-center bg-[#0a0a0f]">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl">⚠️</div>
      <div>
        <p className="text-base font-bold text-slate-200">משהו השתבש</p>
        <p className="mt-1 text-sm text-slate-500">אירעה שגיאה. נסה לרענן את הדף.</p>
      </div>
      <button
        onClick={reset}
        className="rounded-xl px-5 py-2.5 text-sm font-bold text-white"
        style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
      >
        נסה שוב
      </button>
    </div>
  )
}

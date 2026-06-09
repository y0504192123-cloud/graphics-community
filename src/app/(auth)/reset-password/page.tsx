'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const fieldCls = 'w-full rounded-xl border border-white/[0.07] bg-white/[0.04] px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all duration-200 focus:border-purple-500/50 focus:bg-white/[0.06] focus:ring-2 focus:ring-purple-500/20'
const labelCls = 'mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-500'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('הסיסמה חייבת להכיל לפחות 6 תווים')
      return
    }
    if (password !== confirm) {
      setError('הסיסמאות אינן תואמות')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <div
        className="w-full max-w-md rounded-3xl p-8 shadow-2xl"
        style={{
          background: 'rgba(15,10,30,0.85)',
          boxShadow: '0 25px 80px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.06)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="mb-7 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}>
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-slate-100">איפוס סיסמה</h1>
          <p className="mt-1 text-xs text-slate-500">הזן סיסמה חדשה לחשבונך</p>
        </div>

        {error && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.08] px-4 py-3 text-sm text-red-300">
            <span className="text-red-400">⚠</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelCls}>סיסמה חדשה</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className={fieldCls}
              dir="ltr"
            />
          </div>
          <div>
            <label className={labelCls}>אימות סיסמה</label>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              className={fieldCls}
              dir="ltr"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="relative w-full overflow-hidden rounded-xl py-3 text-sm font-bold text-white shadow-lg transition-all duration-200 hover:scale-[1.01] hover:shadow-xl active:scale-[0.99] disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 8px 30px rgba(124,58,237,.4)' }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                מעדכן...
              </span>
            ) : 'שמור סיסמה חדשה'}
          </button>
        </form>
      </div>
    </div>
  )
}

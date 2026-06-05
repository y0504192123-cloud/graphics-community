import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '404 — הדף לא נמצא | Grafi',
}

export default function NotFound() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-6 text-center"
      style={{ background: '#0f0f13' }}
    >
      <div
        className="mb-2 text-9xl font-black leading-none"
        style={{
          background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        404
      </div>

      <div className="mb-6 text-5xl">🔍</div>

      <h1 className="mb-3 text-2xl font-bold text-white">הדף לא נמצא</h1>
      <p className="mb-8 max-w-sm text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,.5)' }}>
        הדף שחיפשת אינו קיים, הועבר למקום אחר, או שאין לך הרשאות לצפות בו.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/dashboard"
          className="rounded-xl px-6 py-3 text-sm font-bold text-white transition hover:opacity-90 hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 8px 24px rgba(124,58,237,.35)' }}
        >
          חזרה לדף הראשי
        </Link>
        <Link
          href="/about"
          className="rounded-xl border px-6 py-3 text-sm font-semibold transition hover:opacity-80"
          style={{ borderColor: 'rgba(255,255,255,.1)', color: 'rgba(255,255,255,.6)' }}
        >
          אודות Grafi
        </Link>
      </div>
    </div>
  )
}

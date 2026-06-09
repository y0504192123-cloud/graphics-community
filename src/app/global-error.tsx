'use client'

import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[global-error]', error.digest ?? error.message, error)
  }, [error])

  return (
    <html lang="he" dir="rtl">
      <body style={{ margin: 0, background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: '16px', fontFamily: 'Arial, sans-serif', color: '#e2e8f0', textAlign: 'center', padding: '16px' }}>
        <div style={{ fontSize: '48px' }}>⚠️</div>
        <p style={{ fontWeight: 700, fontSize: '16px', margin: 0 }}>שגיאה בטעינת האפליקציה</p>
        <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>רענן את הדף. אם הבעיה חוזרת, נסה להתנתק ולהתחבר מחדש.</p>
        {error.digest && (
          <p style={{ color: '#475569', fontSize: '11px', fontFamily: 'monospace', background: 'rgba(255,255,255,.04)', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,.08)', margin: 0 }}>
            {error.digest}
          </p>
        )}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={reset}
            style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: 'white', border: 'none', borderRadius: '12px', padding: '10px 20px', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}
          >
            רענן
          </button>
          <a
            href="/login"
            style={{ background: 'transparent', color: '#94a3b8', border: '1px solid rgba(148,163,184,.3)', borderRadius: '12px', padding: '10px 20px', fontWeight: 600, cursor: 'pointer', fontSize: '14px', textDecoration: 'none' }}
          >
            התנתק והתחבר מחדש
          </a>
        </div>
      </body>
    </html>
  )
}

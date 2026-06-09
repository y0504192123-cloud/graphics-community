'use client'

import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[global-error]', error)
  }, [error])

  return (
    <html lang="he" dir="rtl">
      <body style={{ margin: 0, background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: '16px', fontFamily: 'Arial, sans-serif', color: '#e2e8f0', textAlign: 'center', padding: '16px' }}>
        <div style={{ fontSize: '48px' }}>⚠️</div>
        <p style={{ fontWeight: 700, fontSize: '16px' }}>שגיאה קריטית בטעינת האפליקציה</p>
        <p style={{ color: '#64748b', fontSize: '14px' }}>רענן את הדף או נסה מאוחר יותר.</p>
        <button
          onClick={reset}
          style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: 'white', border: 'none', borderRadius: '12px', padding: '10px 20px', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}
        >
          רענן
        </button>
      </body>
    </html>
  )
}

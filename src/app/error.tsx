'use client'

import { useEffect } from 'react'

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[root-error]', error)
  }, [error])

  return (
    <div style={{ margin: 0, background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: '16px', fontFamily: 'Arial, sans-serif', color: '#e2e8f0', textAlign: 'center', padding: '16px' }}>
      <div style={{ fontSize: '48px' }}>⚠️</div>
      <p style={{ fontWeight: 700, fontSize: '16px', margin: 0 }}>שגיאה בטעינת הדף</p>
      <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
        {error.digest ? `קוד שגיאה: ${error.digest}` : 'אירעה שגיאה בלתי צפויה'}
      </p>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={reset}
          style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: 'white', border: 'none', borderRadius: '12px', padding: '10px 20px', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}
        >
          נסה שוב
        </button>
        <a
          href="/login"
          style={{ background: 'transparent', color: '#94a3b8', border: '1px solid rgba(148,163,184,.3)', borderRadius: '12px', padding: '10px 20px', fontWeight: 600, cursor: 'pointer', fontSize: '14px', textDecoration: 'none' }}
        >
          חזור לעמוד הכניסה
        </a>
      </div>
    </div>
  )
}

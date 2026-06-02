import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import FontIdentifierClient from './FontIdentifierClient'
import { identifyFontFromDB } from './actions'
import type { Font } from '@/types'

export default async function FontIdentifierPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileData?.role !== 'admin') {
    return <ComingSoon />
  }

  const admin = createAdminClient()
  const { data: fontsData } = await admin
    .from('fonts')
    .select('*')
    .order('name', { ascending: true })

  const fonts = (fontsData ?? []) as Font[]

  return (
    <FontIdentifierClient
      identifyFontFromDB={identifyFontFromDB}
      fonts={fonts}
    />
  )
}

function ComingSoon() {
  return (
    <div
      className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-6 py-16 text-center lg:min-h-screen"
      style={{ background: 'var(--bg)' }}
    >
      {/* Glow */}
      <div
        className="pointer-events-none absolute h-72 w-72 rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(124,58,237,.7) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      {/* Icon */}
      <div
        className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-3xl"
        style={{
          background: 'linear-gradient(135deg, rgba(124,58,237,.15), rgba(109,40,217,.25))',
          border: '2px solid rgba(124,58,237,.25)',
          boxShadow: '0 0 40px rgba(124,58,237,.15)',
        }}
      >
        <span className="text-5xl">🚀</span>
      </div>

      {/* Text */}
      <h1
        className="mb-3 text-3xl font-black tracking-tight"
        style={{ color: 'var(--tx)' }}
      >
        בקרוב!
      </h1>

      <p
        className="mb-2 text-lg font-semibold"
        style={{ color: 'var(--tx2)' }}
      >
        מערכת זיהוי הפונטים בהרצה ובפיתוח
      </p>

      <p
        className="mb-1 max-w-sm text-sm leading-relaxed"
        style={{ color: 'var(--tx3)' }}
      >
        בקרוב תוכל להעלות תמונה עם טקסט ולקבל זיהוי פונט מיידי
      </p>

      <p className="text-sm font-medium" style={{ color: 'var(--tx3)' }}>
        בע&quot;ה
      </p>

      {/* Decorative dots */}
      <div className="mt-10 flex items-center gap-2">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="h-2 w-2 rounded-full animate-bounce"
            style={{
              background: 'rgba(124,58,237,.5)',
              animationDelay: `${i * 200}ms`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

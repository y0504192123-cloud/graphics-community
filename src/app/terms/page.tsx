import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'

export const revalidate = 60

export default async function TermsPage() {
  const admin = createAdminClient()
  const { data } = await admin.from('site_settings').select('value').eq('key', 'terms_of_service').single()
  const content = data?.value ?? 'תנאי השימוש טרם הוגדרו.'

  return <PolicyPage title="תנאי השימוש" content={content} />
}

function PolicyPage({ title, content }: { title: string; content: string }) {
  return (
    <div className="min-h-screen" style={{ background: '#0f0f13' }}>
      <div className="mx-auto max-w-3xl px-6 py-12">

        <div className="mb-8 flex items-center gap-3">
          <Link href="/"
            className="rounded-xl px-3 py-1.5 text-xs font-semibold transition hover:opacity-80"
            style={{ background: 'rgba(124,58,237,.15)', color: '#a78bfa' }}>
            ← חזרה
          </Link>
        </div>

        <div className="rounded-3xl p-8 shadow-2xl"
          style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)' }}>
          <h1 className="mb-2 text-2xl font-bold text-white">{title}</h1>
          <p className="mb-8 text-xs" style={{ color: 'rgba(255,255,255,.35)' }}>Grafi — קהילת הגרפיקאים החרדים</p>
          <div className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,.75)' }}>
            {content}
          </div>
        </div>

      </div>
    </div>
  )
}

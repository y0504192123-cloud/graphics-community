import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { MessageSquare, ChevronLeft, Clock } from 'lucide-react'
import type { ForumCategory, ForumThread, Profile } from '@/types'

export default async function ForumPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const [catsRes, recentRes] = await Promise.all([
    admin.from('forum_categories').select('*').order('sort_order', { ascending: true }),
    admin
      .from('forum_threads')
      .select('id, title, category_id, created_at, updated_at, profiles(full_name, username, avatar_url)')
      .order('updated_at', { ascending: false })
      .limit(5),
  ])

  const categories = (catsRes.data ?? []) as ForumCategory[]

  // Count threads per category
  const threadCounts: Record<string, number> = {}
  if (categories.length) {
    for (const cat of categories) {
      const { count } = await admin
        .from('forum_threads')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', cat.id)
      threadCounts[cat.id] = count ?? 0
    }
  }

  const recentThreads = (recentRes.data ?? []) as unknown as (ForumThread & { profiles?: Profile })[]

  function fmtDate(iso: string) {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'עכשיו'
    if (diffMins < 60) return `לפני ${diffMins} דקות`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `לפני ${diffHours} שעות`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `לפני ${diffDays} ימים`
    return d.toLocaleDateString('he-IL')
  }

  return (
    <div className="min-h-full" style={{ background: 'var(--bg)' }}>

      {/* Hero */}
      <div className="relative overflow-hidden px-6 pb-8 pt-8" style={{ background: 'var(--hero)' }}>
        <div className="pointer-events-none absolute -top-16 -start-16 h-64 w-64 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, rgba(124,58,237,.7) 0%, transparent 70%)', filter: 'blur(50px)' }} />
        <div className="grid-pattern absolute inset-0" />
        <div className="relative mx-auto max-w-4xl">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
              <MessageSquare size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--tx)' }}>פורום הקהילה</h1>
              <p className="text-sm" style={{ color: 'var(--tx3)' }}>שאל, ענה, שתף ידע עם גרפיקאים נוספים</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">

        {/* Categories */}
        {categories.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl py-16 text-center" style={{ background: 'var(--s1)', border: '2px dashed var(--bd)' }}>
            <MessageSquare size={32} className="text-slate-300" />
            <p className="text-sm font-semibold" style={{ color: 'var(--tx2)' }}>עדיין אין קטגוריות</p>
            <p className="text-xs" style={{ color: 'var(--tx3)' }}>מנהל יכול להוסיף קטגוריות מפאנל הניהול</p>
          </div>
        ) : (
          <div>
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--tx3)' }}>קטגוריות</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {categories.map(cat => (
                <Link
                  key={cat.id}
                  href={`/forum/${cat.id}`}
                  className="group flex items-start gap-4 rounded-2xl p-5 transition-all hover:scale-[1.01]"
                  style={{ background: 'var(--s1)', border: '1px solid var(--bd)', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl" style={{ background: 'rgba(124,58,237,.08)', border: '1px solid rgba(124,58,237,.12)' }}>
                    {cat.icon ?? '💬'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold transition-colors group-hover:text-purple-600" style={{ color: 'var(--tx)' }}>{cat.name}</p>
                      <ChevronLeft size={15} className="shrink-0 text-slate-300 transition-colors group-hover:text-purple-400" />
                    </div>
                    {cat.description && (
                      <p className="mt-0.5 text-xs" style={{ color: 'var(--tx3)' }}>{cat.description}</p>
                    )}
                    <p className="mt-2 text-xs font-medium text-purple-600">
                      {threadCounts[cat.id] ?? 0} נושאים
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Recent activity */}
        {recentThreads.length > 0 && (
          <div>
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--tx3)' }}>
              <Clock size={13} />
              פעילות אחרונה
            </h2>
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--s1)', border: '1px solid var(--bd)' }}>
              {recentThreads.map((thread, i) => (
                <Link
                  key={thread.id}
                  href={`/forum/${thread.category_id}/${thread.id}`}
                  className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-purple-50/50"
                  style={{ borderTop: i > 0 ? '1px solid var(--bd)' : undefined }}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm" style={{ background: 'rgba(124,58,237,.08)' }}>
                    💬
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold" style={{ color: 'var(--tx)' }}>{thread.title}</p>
                    <p className="text-[11px]" style={{ color: 'var(--tx3)' }}>
                      {thread.profiles?.full_name ?? thread.profiles?.username ?? 'משתמש'} · {fmtDate(thread.updated_at)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

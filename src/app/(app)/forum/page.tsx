import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { MessageSquare, ChevronLeft, Clock, TrendingUp, Users } from 'lucide-react'
import type { ForumCategory, ForumThread, Profile } from '@/types'

export default async function ForumPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const [catsRes, threadsRes, recentRes] = await Promise.all([
    admin.from('forum_categories').select('*').order('sort_order', { ascending: true }),
    admin.from('forum_threads').select('id, category_id'),
    admin.from('forum_threads')
      .select('id, title, category_id, created_at, updated_at, profiles(full_name, username, avatar_url)')
      .order('updated_at', { ascending: false })
      .limit(6),
  ])

  const categories = (catsRes.data ?? []) as ForumCategory[]
  const allThreads = (threadsRes.data ?? []) as { id: string; category_id: string }[]

  // Count threads per category
  const threadCounts: Record<string, number> = {}
  for (const t of allThreads) {
    threadCounts[t.category_id] = (threadCounts[t.category_id] ?? 0) + 1
  }

  // Count replies per category via thread ids
  const allThreadIds = allThreads.map(t => t.id)
  const replyCounts: Record<string, number> = {}
  if (allThreadIds.length) {
    const { data: replyData } = await admin
      .from('forum_replies')
      .select('thread_id')
      .in('thread_id', allThreadIds)
    const threadCatMap = Object.fromEntries(allThreads.map(t => [t.id, t.category_id]))
    for (const r of replyData ?? []) {
      const catId = threadCatMap[r.thread_id]
      if (catId) replyCounts[catId] = (replyCounts[catId] ?? 0) + 1
    }
  }

  const recentThreads = (recentRes.data ?? []) as unknown as (ForumThread & { profiles?: Profile })[]

  const totalThreads = allThreads.length
  const totalReplies = Object.values(replyCounts).reduce((a, b) => a + b, 0)

  function fmtDate(iso: string) {
    const diffMs = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diffMs / 60000)
    if (mins < 1) return 'עכשיו'
    if (mins < 60) return `לפני ${mins} דק׳`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `לפני ${hrs} שע׳`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `לפני ${days} ימים`
    return new Date(iso).toLocaleDateString('he-IL')
  }

  return (
    <div className="min-h-full" style={{ background: 'var(--bg)' }}>

      {/* Hero */}
      <div className="relative overflow-hidden px-6 pb-8 pt-8" style={{ background: 'var(--hero)' }}>
        <div className="pointer-events-none absolute -start-20 -top-20 h-72 w-72 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, rgba(124,58,237,.8) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="grid-pattern absolute inset-0 opacity-40" />
        <div className="relative mx-auto max-w-4xl">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex h-13 w-13 items-center justify-center rounded-2xl" style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', boxShadow: '0 4px 20px rgba(124,58,237,.4)' }}>
                <MessageSquare size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: 'var(--tx)' }}>פורום הקהילה</h1>
                <p className="text-sm" style={{ color: 'var(--tx3)' }}>שאל, ענה, שתף ידע עם גרפיקאים נוספים</p>
              </div>
            </div>
            {/* Stats */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 rounded-xl px-4 py-2.5" style={{ background: 'rgba(124,58,237,.08)', border: '1px solid rgba(124,58,237,.15)' }}>
                <TrendingUp size={14} className="text-purple-500" />
                <span className="text-sm font-bold" style={{ color: 'var(--tx)' }}>{totalThreads}</span>
                <span className="text-xs" style={{ color: 'var(--tx3)' }}>נושאים</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl px-4 py-2.5" style={{ background: 'rgba(124,58,237,.08)', border: '1px solid rgba(124,58,237,.15)' }}>
                <Users size={14} className="text-purple-500" />
                <span className="text-sm font-bold" style={{ color: 'var(--tx)' }}>{totalReplies}</span>
                <span className="text-xs" style={{ color: 'var(--tx3)' }}>תגובות</span>
              </div>
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
          <section>
            <h2 className="mb-4 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--tx3)' }}>קטגוריות</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {categories.map(cat => (
                <Link
                  key={cat.id}
                  href={`/forum/${cat.id}`}
                  className="group relative rounded-2xl p-5 transition-all hover:scale-[1.01] hover:-translate-y-0.5"
                  style={{ background: 'var(--s1)', border: '1px solid var(--bd)', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl transition-transform group-hover:scale-110"
                      style={{ background: 'linear-gradient(135deg,rgba(124,58,237,.12),rgba(79,70,229,.08))', border: '1px solid rgba(124,58,237,.15)' }}>
                      {cat.icon ?? '💬'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-bold text-base leading-snug transition-colors group-hover:text-purple-600" style={{ color: 'var(--tx)' }}>{cat.name}</p>
                        <ChevronLeft size={14} className="mt-0.5 shrink-0 text-slate-300 transition-colors group-hover:text-purple-400" />
                      </div>
                      {cat.description && (
                        <p className="mt-1 text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--tx3)' }}>{cat.description}</p>
                      )}
                      <div className="mt-3 flex items-center gap-3">
                        <span className="flex items-center gap-1 text-xs font-semibold text-purple-600">
                          <MessageSquare size={11} />
                          {threadCounts[cat.id] ?? 0} נושאים
                        </span>
                        <span className="text-xs" style={{ color: 'var(--tx3)' }}>·</span>
                        <span className="text-xs" style={{ color: 'var(--tx3)' }}>
                          {replyCounts[cat.id] ?? 0} תגובות
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Recent activity */}
        {recentThreads.length > 0 && (
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--tx3)' }}>
              <Clock size={12} />
              פעילות אחרונה
            </h2>
            <div className="overflow-hidden rounded-2xl" style={{ background: 'var(--s1)', border: '1px solid var(--bd)' }}>
              {recentThreads.map((thread, i) => (
                <Link
                  key={thread.id}
                  href={`/forum/${thread.category_id}/${thread.id}`}
                  className="group flex items-center gap-3.5 px-5 py-3.5 transition hover:bg-purple-50/40"
                  style={{ borderTop: i > 0 ? '1px solid var(--bd)' : undefined }}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-base"
                    style={{ background: 'rgba(124,58,237,.08)', border: '1px solid rgba(124,58,237,.1)' }}>
                    💬
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold transition-colors group-hover:text-purple-600" style={{ color: 'var(--tx)' }}>{thread.title}</p>
                    <p className="mt-0.5 text-[11px]" style={{ color: 'var(--tx3)' }}>
                      {(thread.profiles as any)?.full_name ?? (thread.profiles as any)?.username ?? 'משתמש'} · {fmtDate(thread.updated_at)}
                    </p>
                  </div>
                  <ChevronLeft size={13} className="shrink-0 text-slate-300 transition-colors group-hover:text-purple-400" />
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

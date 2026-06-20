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

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [catsRes, threadsRes, recentRes, weekRes] = await Promise.all([
    admin.from('forum_categories').select('*').order('sort_order', { ascending: true }),
    admin.from('forum_threads').select('id, category_id'),
    admin.from('forum_threads')
      .select('id, title, category_id, created_at, updated_at, profiles(full_name, username, avatar_url)')
      .order('updated_at', { ascending: false })
      .limit(6),
    admin.from('forum_threads')
      .select('id, title, category_id')
      .gte('updated_at', weekAgo)
      .limit(60),
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

  // Popular this week
  const weekThreads = (weekRes.data ?? []) as { id: string; title: string; category_id: string }[]
  const weekIds = weekThreads.map(t => t.id)
  const weekReplyMap: Record<string, number> = {}
  if (weekIds.length) {
    const { data: weekReplies } = await admin.from('forum_replies').select('thread_id').in('thread_id', weekIds)
    for (const r of weekReplies ?? []) weekReplyMap[r.thread_id] = (weekReplyMap[r.thread_id] ?? 0) + 1
  }
  const popularThisWeek = [...weekThreads]
    .filter(t => (weekReplyMap[t.id] ?? 0) > 0)
    .sort((a, b) => (weekReplyMap[b.id] ?? 0) - (weekReplyMap[a.id] ?? 0))
    .slice(0, 5)

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
        ) : (() => {
          const adminCats = categories.filter(c => c.admin_only)
          const regularCats = categories.filter(c => !c.admin_only)
          return (
            <section>
              <h2 className="mb-4 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--tx3)' }}>קטגוריות</h2>

              {/* Special full-width cards for admin_only categories */}
              {adminCats.map(cat => {
                const isBenefit = cat.icon === '🎁'
                const cardBg = isBenefit
                  ? 'linear-gradient(135deg,#4c1d95 0%,#6d28d9 40%,#7c3aed 70%,#8b5cf6 100%)'
                  : 'linear-gradient(135deg,#92400e 0%,#b45309 30%,#d97706 60%,#f59e0b 100%)'
                const cardShadow = isBenefit ? '0 8px 32px rgba(109,40,217,.35)' : '0 8px 32px rgba(217,119,6,.35)'
                const orb1 = isBenefit ? '#a78bfa' : '#fbbf24'
                const orb2 = isBenefit ? '#c4b5fd' : '#fde68a'
                const badgeColor = isBenefit ? '#6d28d9' : '#b45309'
                const badgeLabel = isBenefit ? '🎁 הטבות בלעדיות' : '🏆 אתגר שבועי'
                const defaultIcon = isBenefit ? '🎁' : '🎯'
                const threadLabel = isBenefit ? 'הטבות' : 'אתגרים'
                const replyLabel = isBenefit ? 'תגובות' : 'השתתפויות'
                const ctaLabel = isBenefit ? 'לצפייה' : 'השתתף'
                return (
                  <Link
                    key={cat.id}
                    href={`/forum/${cat.id}`}
                    className="group relative mb-4 flex overflow-hidden rounded-3xl transition-all duration-300 hover:-translate-y-1.5 hover:scale-[1.01]"
                    style={{ background: cardBg, boxShadow: cardShadow, minHeight: '140px' }}
                  >
                    <div className="pointer-events-none absolute -end-10 -top-10 h-48 w-48 rounded-full opacity-20" style={{ background: `radial-gradient(circle,${orb1},transparent 70%)` }} />
                    <div className="pointer-events-none absolute -bottom-8 -start-8 h-36 w-36 rounded-full opacity-15" style={{ background: `radial-gradient(circle,${orb2},transparent 70%)` }} />
                    <div className="pointer-events-none absolute inset-0" style={{ background: 'repeating-linear-gradient(45deg,transparent,transparent 20px,rgba(255,255,255,.03) 20px,rgba(255,255,255,.03) 21px)' }} />

                    <div className="relative flex w-full items-center gap-6 px-7 py-6">
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-5xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
                        style={{ background: 'rgba(255,255,255,.18)', backdropFilter: 'blur(8px)', boxShadow: '0 4px 16px rgba(0,0,0,.15)', border: '1px solid rgba(255,255,255,.25)' }}>
                        {cat.icon ?? defaultIcon}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black tracking-wide uppercase"
                            style={{ background: 'rgba(255,255,255,.95)', color: badgeColor, boxShadow: '0 2px 8px rgba(0,0,0,.12)' }}>
                            {badgeLabel}
                          </span>
                        </div>
                        <p className="text-xl font-black leading-tight text-white drop-shadow-sm">{cat.name}</p>
                        {cat.description && (
                          <p className="mt-1.5 text-sm leading-relaxed opacity-85" style={{ color: 'rgba(255,255,255,.9)' }}>{cat.description}</p>
                        )}
                        <div className="mt-3 flex items-center gap-4">
                          <span className="flex items-center gap-1.5 text-sm font-bold" style={{ color: 'rgba(255,255,255,.95)' }}>
                            <MessageSquare size={13} />
                            {threadCounts[cat.id] ?? 0} {threadLabel}
                          </span>
                          <span className="text-sm opacity-50 text-white">·</span>
                          <span className="text-sm font-semibold opacity-80 text-white">
                            {replyCounts[cat.id] ?? 0} {replyLabel}
                          </span>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-black transition-all duration-200 group-hover:gap-3"
                        style={{ background: 'rgba(255,255,255,.2)', backdropFilter: 'blur(4px)', color: 'white', border: '1px solid rgba(255,255,255,.3)' }}>
                        <span>{ctaLabel}</span>
                        <ChevronLeft size={16} className="transition-transform duration-200 group-hover:-translate-x-1" />
                      </div>
                    </div>
                  </Link>
                )
              })}

              {/* Regular categories grid */}
              {regularCats.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {regularCats.map((cat, ci) => {
                    const cardGrads = [
                      'linear-gradient(135deg,#6B21A8,#4F46E5)',
                      'linear-gradient(135deg,#7c3aed,#2563eb)',
                      'linear-gradient(135deg,#9333ea,#0891b2)',
                      'linear-gradient(135deg,#7c3aed,#db2777)',
                    ]
                    const cardGrad = cardGrads[ci % cardGrads.length]
                    return (
                      <Link
                        key={cat.id}
                        href={`/forum/${cat.id}`}
                        className="group relative overflow-hidden rounded-2xl p-5 transition-all duration-200 hover:-translate-y-1"
                        style={{ background: cardGrad, boxShadow: '0 4px 16px rgba(107,33,168,.25)', color: 'white' }}
                      >
                        <div className="pointer-events-none absolute -end-6 -top-6 h-28 w-28 rounded-full opacity-15" style={{ background: 'white' }} />
                        <div className="pointer-events-none absolute -bottom-4 -start-4 h-20 w-20 rounded-full opacity-10" style={{ background: 'white' }} />
                        <div className="relative flex items-start gap-4">
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-4xl transition-transform duration-200 group-hover:scale-110"
                            style={{ background: 'rgba(255,255,255,.18)', backdropFilter: 'blur(4px)' }}>
                            {cat.icon ?? '💬'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-bold text-base leading-snug text-white">{cat.name}</p>
                              <ChevronLeft size={14} className="mt-0.5 shrink-0 opacity-60 transition-opacity group-hover:opacity-100" style={{ color: 'white' }} />
                            </div>
                            {cat.description && (
                              <p className="mt-1 text-xs leading-relaxed line-clamp-2 opacity-80" style={{ color: 'rgba(255,255,255,.85)' }}>{cat.description}</p>
                            )}
                            <div className="mt-3 flex items-center gap-3">
                              <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: 'rgba(255,255,255,.9)' }}>
                                <MessageSquare size={11} />
                                {threadCounts[cat.id] ?? 0} נושאים
                              </span>
                              <span className="text-xs opacity-60" style={{ color: 'white' }}>·</span>
                              <span className="text-xs opacity-75" style={{ color: 'rgba(255,255,255,.85)' }}>
                                {replyCounts[cat.id] ?? 0} תגובות
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </section>
          )
        })()}

        {/* Popular this week */}
        {popularThisWeek.length > 0 && (
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--tx3)' }}>
              <TrendingUp size={12} />
              פופולרי השבוע
            </h2>
            <div className="overflow-hidden rounded-2xl" style={{ background: 'var(--s1)', border: '1px solid var(--bd)' }}>
              {popularThisWeek.map((thread, i) => {
                const cat = categories.find(c => c.id === thread.category_id)
                const MEDALS = ['🥇', '🥈', '🥉', '4', '5']
                return (
                  <a
                    key={thread.id}
                    href={`/forum/${thread.category_id}/${thread.id}`}
                    className="group flex items-center gap-3.5 px-5 py-3.5 transition hover:bg-purple-50/40"
                    style={{ borderTop: i > 0 ? '1px solid var(--bd)' : undefined, display: 'flex' }}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
                      style={{ background: i < 3 ? 'rgba(124,58,237,.08)' : 'var(--inp)', color: i < 3 ? '#7c3aed' : 'var(--tx3)', border: '1px solid var(--bd)' }}>
                      {i < 3 ? MEDALS[i] : i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold transition-colors group-hover:text-purple-600" style={{ color: 'var(--tx)' }}>
                        {thread.title}
                      </p>
                      {cat && <p className="mt-0.5 text-[11px]" style={{ color: 'var(--tx3)' }}>{cat.icon} {cat.name}</p>}
                    </div>
                    <span className="flex items-center gap-1 text-xs font-bold text-purple-600 shrink-0">
                      <MessageSquare size={12} />
                      {weekReplyMap[thread.id] ?? 0}
                    </span>
                  </a>
                )
              })}
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

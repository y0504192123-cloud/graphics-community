import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { MessageSquare, Pin, Lock, Eye, ChevronRight, Plus, Search, CheckCircle2, Sparkles } from 'lucide-react'
import type { ForumCategory, ForumThread, Profile } from '@/types'
import NewThreadForm from './NewThreadForm'

interface Props {
  params: Promise<{ categoryId: string }>
  searchParams: Promise<{ sort?: string; q?: string; new?: string }>
}

function fmtDate(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'עכשיו'
  if (mins < 60) return `לפני ${mins} דק׳`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `לפני ${hrs} שע׳`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `לפני ${days} ימים`
  return new Date(iso).toLocaleDateString('he-IL')
}

function isNew(iso: string) {
  return Date.now() - new Date(iso).getTime() < 24 * 60 * 60 * 1000
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

const GRADS = ['from-violet-500 to-purple-700', 'from-pink-500 to-rose-700', 'from-blue-500 to-indigo-700', 'from-emerald-500 to-teal-700']
function grad(uid: string) {
  let h = 0; for (let i = 0; i < uid.length; i++) h = (Math.imul(31, h) + uid.charCodeAt(i)) | 0
  return GRADS[Math.abs(h) % GRADS.length]
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { categoryId } = await params
  const sp = await searchParams
  const sort = sp.sort ?? 'new'
  const q = sp.q ?? ''
  const showNewForm = sp.new === '1'

  const admin = createAdminClient()

  const { data: catData } = await admin.from('forum_categories').select('*').eq('id', categoryId).single()
  if (!catData) notFound()
  const category = catData as ForumCategory

  let query = admin
    .from('forum_threads')
    .select('*, profiles(id, full_name, username, avatar_url, role)')
    .eq('category_id', categoryId)

  if (q) query = query.ilike('title', `%${q}%`)

  const { data: threadsRaw } = await query
    .order('is_pinned', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(60)

  let threads = (threadsRaw ?? []) as (ForumThread & { profiles?: Profile })[]

  // Fetch reply counts and best-answer status in one query
  const threadIds = threads.map(t => t.id)
  const replyCountMap: Record<string, number> = {}
  const bestAnswerSet = new Set<string>()

  if (threadIds.length) {
    const { data: repliesData } = await admin
      .from('forum_replies')
      .select('thread_id, is_best_answer')
      .in('thread_id', threadIds)
    for (const r of repliesData ?? []) {
      replyCountMap[r.thread_id] = (replyCountMap[r.thread_id] ?? 0) + 1
      if (r.is_best_answer) bestAnswerSet.add(r.thread_id)
    }
  }

  // Apply sort
  if (sort === 'popular') {
    threads = threads.slice().sort((a, b) => (replyCountMap[b.id] ?? 0) - (replyCountMap[a.id] ?? 0))
  } else if (sort === 'unanswered') {
    threads = threads.filter(t => (replyCountMap[t.id] ?? 0) === 0)
  }

  return (
    <div className="min-h-full" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <div className="relative overflow-hidden px-6 pb-6 pt-6" style={{ background: 'var(--hero)' }}>
        <div className="grid-pattern absolute inset-0 opacity-40" />
        <div className="relative mx-auto max-w-4xl">
          <nav className="mb-2 flex items-center gap-1.5 text-xs" style={{ color: 'var(--tx3)' }}>
            <Link href="/forum" className="hover:text-purple-600 transition">פורום</Link>
            <ChevronRight size={11} />
            <span style={{ color: 'var(--tx2)' }}>{category.name}</span>
          </nav>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl"
                style={{ background: 'linear-gradient(135deg,rgba(124,58,237,.15),rgba(79,70,229,.1))', border: '1px solid rgba(124,58,237,.2)' }}>
                {category.icon ?? '💬'}
              </div>
              <div>
                <h1 className="text-xl font-bold" style={{ color: 'var(--tx)' }}>{category.name}</h1>
                {category.description && <p className="text-sm" style={{ color: 'var(--tx3)' }}>{category.description}</p>}
              </div>
            </div>
            <Link
              href={`/forum/${categoryId}?new=1`}
              className="flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', boxShadow: '0 4px 14px rgba(124,58,237,.35)' }}
            >
              <Plus size={15} />
              נושא חדש
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-5 space-y-4">

        {showNewForm && <NewThreadForm categoryId={categoryId} />}

        {/* Sort + Search */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-0.5 rounded-xl p-1" style={{ background: 'var(--inp)', border: '1px solid var(--bd)' }}>
            {[
              { id: 'new', label: 'חדש' },
              { id: 'popular', label: 'פופולרי' },
              { id: 'unanswered', label: 'ללא מענה' },
            ].map(s => (
              <Link
                key={s.id}
                href={`/forum/${categoryId}?sort=${s.id}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
                className="rounded-lg px-3.5 py-1.5 text-xs font-semibold transition"
                style={sort === s.id
                  ? { background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: 'white', boxShadow: '0 2px 8px rgba(124,58,237,.3)' }
                  : { color: 'var(--tx2)' }
                }
              >
                {s.label}
              </Link>
            ))}
          </div>
          <form action={`/forum/${categoryId}`} method="get"
            className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2 min-w-[160px]"
            style={{ background: 'var(--inp)', border: '1px solid var(--bd)' }}>
            <input type="hidden" name="sort" value={sort} />
            <Search size={13} style={{ color: 'var(--tx3)' }} />
            <input
              name="q"
              defaultValue={q}
              placeholder="חפש נושא..."
              className="flex-1 bg-transparent text-xs outline-none placeholder:text-slate-400"
              style={{ color: 'var(--tx)' }}
            />
          </form>
        </div>

        {/* Threads list */}
        {threads.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl py-16 text-center" style={{ background: 'var(--s1)', border: '2px dashed var(--bd)' }}>
            <MessageSquare size={32} className="text-slate-300" />
            <p className="text-sm font-semibold" style={{ color: 'var(--tx2)' }}>
              {q ? 'לא נמצאו נושאים תואמים' : sort === 'unanswered' ? 'כל הנושאים קיבלו מענה 🎉' : 'אין נושאים עדיין'}
            </p>
            {!q && sort === 'new' && (
              <Link href={`/forum/${categoryId}?new=1`} className="mt-1 text-xs font-bold text-purple-600 hover:text-purple-700 transition">
                פתח את הנושא הראשון ←
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-2 rounded-2xl" style={{}}>
            {threads.map((thread, i) => {
              const replies = replyCountMap[thread.id] ?? 0
              const hasBest = bestAnswerSet.has(thread.id)
              const threadIsNew = isNew(thread.created_at)
              const authorName = thread.profiles?.full_name ?? thread.profiles?.username ?? 'משתמש'
              const authorId = thread.user_id

              return (
                <Link
                  key={thread.id}
                  href={`/forum/${categoryId}/${thread.id}`}
                  className="group flex items-start gap-4 px-5 py-4 rounded-2xl transition-all duration-150 hover:-translate-y-0.5"
                  style={{ background: 'var(--s1)', border: '1px solid var(--bd)', boxShadow: '0 1px 4px rgba(0,0,0,.04)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(124,58,237,.12)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,58,237,.25)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,.04)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--bd)' }}
                >
                  {/* Author avatar */}
                  <div className={`mt-0.5 h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br ${grad(authorId)} flex items-center justify-center text-xs font-bold text-white`}>
                    {thread.profiles?.avatar_url
                      ? <img src={thread.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
                      : <span>{initials(authorName)}</span>
                    }
                  </div>

                  <div className="min-w-0 flex-1">
                    {/* Title row */}
                    <div className="flex flex-wrap items-start gap-1.5">
                      {thread.is_pinned && (
                        <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold" style={{ background: 'rgba(234,179,8,.12)', color: '#b45309' }}>
                          <Pin size={9} /> מוצמד
                        </span>
                      )}
                      {thread.is_locked && (
                        <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold" style={{ background: 'rgba(100,116,139,.1)', color: 'var(--tx3)' }}>
                          <Lock size={9} /> נעול
                        </span>
                      )}
                      {hasBest && (
                        <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold" style={{ background: 'rgba(16,185,129,.1)', color: '#059669' }}>
                          <CheckCircle2 size={9} /> נפתר
                        </span>
                      )}
                      {threadIsNew && !thread.is_pinned && (
                        <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold" style={{ background: 'rgba(124,58,237,.1)', color: '#7c3aed' }}>
                          <Sparkles size={9} /> חדש
                        </span>
                      )}
                    </div>
                    <p className="mt-1 font-bold leading-snug transition-colors group-hover:text-purple-600 line-clamp-2" style={{ color: 'var(--tx)' }}>
                      {thread.title}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px]" style={{ color: 'var(--tx3)' }}>
                      <span className="font-medium" style={{ color: 'var(--tx2)' }}>{authorName}</span>
                      <span>·</span>
                      <span>{fmtDate(thread.updated_at)}</span>
                      <span className="flex items-center gap-1">
                        <MessageSquare size={11} />
                        {replies} תגובות
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye size={11} />
                        {thread.views ?? 0}
                      </span>
                      {replies === 0 && (
                        <span className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: 'rgba(239,68,68,.08)', color: '#ef4444' }}>
                          ללא מענה
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight size={14} className="mt-3 shrink-0 rotate-180 text-slate-300 transition-colors group-hover:text-purple-400" />
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

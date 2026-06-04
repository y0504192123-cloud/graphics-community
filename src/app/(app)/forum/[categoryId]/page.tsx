import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { MessageSquare, Pin, Lock, Eye, ChevronRight, Plus, Search } from 'lucide-react'
import type { ForumCategory, ForumThread, Profile } from '@/types'
import NewThreadForm from './NewThreadForm'

interface Props {
  params: Promise<{ categoryId: string }>
  searchParams: Promise<{ sort?: string; q?: string; new?: string }>
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

  const { data: threadsRaw } = await query.order('is_pinned', { ascending: false }).order('created_at', { ascending: false }).limit(50)

  // Count replies and determine "unanswered"
  let threads = (threadsRaw ?? []) as (ForumThread & { profiles?: Profile })[]

  // Fetch reply counts
  const replyCountMap: Record<string, number> = {}
  if (threads.length) {
    const ids = threads.map(t => t.id)
    for (const id of ids) {
      const { count } = await admin.from('forum_replies').select('*', { count: 'exact', head: true }).eq('thread_id', id)
      replyCountMap[id] = count ?? 0
    }
  }

  // Apply sort
  if (sort === 'popular') {
    threads = threads.slice().sort((a, b) => (replyCountMap[b.id] ?? 0) - (replyCountMap[a.id] ?? 0))
  } else if (sort === 'unanswered') {
    threads = threads.filter(t => (replyCountMap[t.id] ?? 0) === 0)
  }

  function fmtDate(iso: string) {
    const d = new Date(iso)
    const now = new Date()
    const diff = Math.floor((now.getTime() - d.getTime()) / 86400000)
    if (diff === 0) return 'היום'
    if (diff === 1) return 'אתמול'
    if (diff < 30) return `לפני ${diff} ימים`
    return d.toLocaleDateString('he-IL')
  }

  return (
    <div className="min-h-full" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <div className="relative overflow-hidden px-6 pb-6 pt-6" style={{ background: 'var(--hero)' }}>
        <div className="grid-pattern absolute inset-0" />
        <div className="relative mx-auto max-w-4xl">
          <nav className="mb-2 flex items-center gap-1.5 text-xs" style={{ color: 'var(--tx3)' }}>
            <Link href="/forum" className="hover:text-purple-600 transition">פורום</Link>
            <ChevronRight size={11} />
            <span style={{ color: 'var(--tx2)' }}>{category.name}</span>
          </nav>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{category.icon ?? '💬'}</span>
              <div>
                <h1 className="text-xl font-bold" style={{ color: 'var(--tx)' }}>{category.name}</h1>
                {category.description && <p className="text-sm" style={{ color: 'var(--tx3)' }}>{category.description}</p>}
              </div>
            </div>
            <Link
              href={`/forum/${categoryId}?new=1`}
              className="flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}
            >
              <Plus size={15} />
              נושא חדש
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-6 space-y-4">

        {/* New thread form */}
        {showNewForm && <NewThreadForm categoryId={categoryId} />}

        {/* Sort + Search */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 rounded-xl p-1" style={{ background: 'var(--inp)', border: '1px solid var(--bd)' }}>
            {[
              { id: 'new', label: 'חדש' },
              { id: 'popular', label: 'פופולרי' },
              { id: 'unanswered', label: 'ללא מענה' },
            ].map(s => (
              <Link
                key={s.id}
                href={`/forum/${categoryId}?sort=${s.id}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold transition"
                style={sort === s.id
                  ? { background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: 'white' }
                  : { color: 'var(--tx2)' }
                }
              >
                {s.label}
              </Link>
            ))}
          </div>
          <form action={`/forum/${categoryId}`} method="get" className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2 min-w-[160px]" style={{ background: 'var(--inp)', border: '1px solid var(--bd)' }}>
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
              {q ? 'לא נמצאו נושאים תואמים' : 'אין נושאים עדיין'}
            </p>
            {!q && (
              <Link href={`/forum/${categoryId}?new=1`} className="mt-1 text-xs font-bold text-purple-600 hover:text-purple-700 transition">
                פתח את הנושא הראשון ←
              </Link>
            )}
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--s1)', border: '1px solid var(--bd)' }}>
            {threads.map((thread, i) => (
              <Link
                key={thread.id}
                href={`/forum/${categoryId}/${thread.id}`}
                className="group flex items-start gap-4 px-5 py-4 transition hover:bg-purple-50/30"
                style={{ borderTop: i > 0 ? '1px solid var(--bd)' : undefined }}
              >
                {/* Icon */}
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: thread.is_pinned ? 'rgba(234,179,8,.1)' : 'rgba(124,58,237,.07)' }}>
                  {thread.is_pinned ? <Pin size={15} className="text-amber-500" /> : thread.is_locked ? <Lock size={15} className="text-slate-400" /> : <MessageSquare size={15} className="text-purple-500" />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold leading-snug transition-colors group-hover:text-purple-600" style={{ color: 'var(--tx)' }}>
                      {thread.is_pinned && <span className="me-1.5 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">מוצמד</span>}
                      {thread.title}
                    </p>
                    <span className="shrink-0 text-[11px]" style={{ color: 'var(--tx3)' }}>{fmtDate(thread.updated_at)}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-3 text-[11px]" style={{ color: 'var(--tx3)' }}>
                    <span>{thread.profiles?.full_name ?? thread.profiles?.username ?? 'משתמש'}</span>
                    <span className="flex items-center gap-1"><MessageSquare size={11} />{replyCountMap[thread.id] ?? 0}</span>
                    <span className="flex items-center gap-1"><Eye size={11} />{thread.views}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

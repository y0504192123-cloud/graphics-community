import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ChevronRight } from 'lucide-react'
import ThreadClient from './ThreadClient'
import { incrementViews } from '../../actions'
import type { ForumCategory, ForumThread, ForumReply, Profile } from '@/types'

interface Props {
  params: Promise<{ categoryId: string; threadId: string }>
}

export default async function ThreadPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { categoryId, threadId } = await params

  const admin = createAdminClient()

  const [catRes, threadRes, repliesRes, profileRes] = await Promise.all([
    admin.from('forum_categories').select('*').eq('id', categoryId).single(),
    admin.from('forum_threads').select('*, profiles(id, full_name, username, avatar_url, role)').eq('id', threadId).single(),
    admin.from('forum_replies').select('*, profiles(id, full_name, username, avatar_url, role)').eq('thread_id', threadId).order('created_at', { ascending: true }),
    admin.from('profiles').select('role').eq('id', user.id).single(),
  ])

  if (!catRes.data) { console.error('[ThreadPage] catRes error:', catRes.error, 'categoryId:', categoryId); notFound() }
  if (!threadRes.data) { console.error('[ThreadPage] threadRes error:', threadRes.error, 'threadId:', threadId); notFound() }

  const category = catRes.data as ForumCategory
  const thread = threadRes.data as ForumThread & { profiles?: Profile }
  const repliesRaw = (repliesRes.data ?? []) as (ForumReply & { profiles?: Profile })[]
  const currentProfile = profileRes.data as { role: string } | null
  const isAdmin = currentProfile?.role === 'admin'

  // Fetch likes for current user
  const replyIds = repliesRaw.map(r => r.id)
  let userLikedSet = new Set<string>()
  let likeCountMap: Record<string, number> = {}

  if (replyIds.length) {
    const [likesRes, countRes] = await Promise.all([
      admin.from('forum_likes').select('reply_id').eq('user_id', user.id).in('reply_id', replyIds),
      admin.from('forum_likes').select('reply_id').in('reply_id', replyIds),
    ])
    userLikedSet = new Set((likesRes.data ?? []).map((l: { reply_id: string }) => l.reply_id))
    for (const row of (countRes.data ?? []) as { reply_id: string }[]) {
      likeCountMap[row.reply_id] = (likeCountMap[row.reply_id] ?? 0) + 1
    }
  }

  const replies = repliesRaw.map(r => ({
    ...r,
    user_liked: userLikedSet.has(r.id),
    like_count: likeCountMap[r.id] ?? 0,
  }))

  // Increment views (fire and forget)
  incrementViews(threadId).catch(() => {})

  const isThreadAuthor = thread.user_id === user.id

  // Fetch current user's full profile for display
  const { data: myProfile } = await admin.from('profiles').select('*').eq('id', user.id).single()

  return (
    <div className="min-h-full" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <div className="relative overflow-hidden px-6 pb-5 pt-5" style={{ background: 'var(--hero)' }}>
        <div className="grid-pattern absolute inset-0" />
        <div className="relative mx-auto max-w-3xl">
          <nav className="mb-1.5 flex items-center gap-1.5 text-xs" style={{ color: 'var(--tx3)' }}>
            <Link href="/forum" className="hover:text-purple-600 transition">פורום</Link>
            <ChevronRight size={11} />
            <Link href={`/forum/${categoryId}`} className="hover:text-purple-600 transition">{category.name}</Link>
            <ChevronRight size={11} />
            <span className="truncate max-w-[200px]" style={{ color: 'var(--tx2)' }}>{thread.title}</span>
          </nav>
          <h1 className="text-lg font-bold leading-snug" style={{ color: 'var(--tx)' }}>{thread.title}</h1>
        </div>
      </div>

      <ThreadClient
        thread={thread}
        replies={replies}
        currentUserId={user.id}
        currentProfile={myProfile}
        isAdmin={isAdmin}
        categoryId={categoryId}
        isThreadAuthor={isThreadAuthor}
      />
    </div>
  )
}

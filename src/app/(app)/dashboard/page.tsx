import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Profile } from '@/types'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()

  const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    profileRes,
    userForumRes,
    userPortfolioRes,
    unreadMsgRes,
    recentForumRaw,
    recentInspirationRes,
    weeklyThreadsRes,
    openJobsRes,
    onlineDesignersRes,
    dotWRes,
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user!.id).single(),
    supabase.from('forum_threads').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
    supabase.from('portfolio_items').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
    supabase.from('private_messages').select('id', { count: 'exact', head: true }).eq('receiver_id', user!.id).eq('is_read', false),
    // Fetch threads without join — avoids FK dependency
    admin.from('forum_threads').select('id, title, category_id, created_at, user_id').order('created_at', { ascending: false }).limit(5),
    admin.from('inspiration_posts').select('id, title, image_url, created_at, user_id').order('created_at', { ascending: false }).limit(4),
    admin.from('forum_threads').select('id, title, category_id, created_at, user_id').gte('created_at', weekAgo).limit(20),
    admin.from('jobs').select('id, title, budget_min, budget_max, category, created_at').eq('status', 'open').order('created_at', { ascending: false }).limit(3),
    admin.from('profiles').select('id, full_name, username, avatar_url, specialization').gte('last_seen', fifteenMinsAgo).neq('id', user!.id).limit(6),
    admin.from('site_settings').select('value').eq('key', 'designer_of_week').single(),
  ])

  // Batch-fetch profiles for recent forum threads (same pattern as forum category page)
  const recentForumThreads = (recentForumRaw.data ?? []) as any[]
  const forumAuthorIds = Array.from(new Set(recentForumThreads.map((t) => t.user_id).filter(Boolean)))
  const { data: forumAuthors } = forumAuthorIds.length
    ? await admin.from('profiles').select('id, full_name, username, avatar_url').in('id', forumAuthorIds)
    : { data: [] }
  const forumAuthorMap = Object.fromEntries((forumAuthors ?? []).map((p) => [p.id, p]))
  const recentForum = recentForumThreads.map((t) => ({ ...t, profiles: forumAuthorMap[t.user_id] ?? null }))

  // Batch-fetch profiles for inspiration posts
  const inspirationPosts = (recentInspirationRes.data ?? []) as any[]
  const inspAuthorIds = Array.from(new Set(inspirationPosts.map((p) => p.user_id).filter(Boolean)))
  const { data: inspAuthors } = inspAuthorIds.length
    ? await admin.from('profiles').select('id, full_name, username').in('id', inspAuthorIds)
    : { data: [] }
  const inspAuthorMap = Object.fromEntries((inspAuthors ?? []).map((p) => [p.id, p]))
  const recentInspiration = inspirationPosts.map((p) => ({ ...p, profiles: inspAuthorMap[p.user_id] ?? null }))

  // Popular this week: sort weekly threads by reply count
  const weeklyThreads = (weeklyThreadsRes.data ?? []) as any[]
  const weeklyThreadIds = weeklyThreads.map((t) => t.id)
  let popularThreads: any[] = []
  if (weeklyThreadIds.length > 0) {
    const { data: repliesData } = await admin.from('forum_replies').select('thread_id').in('thread_id', weeklyThreadIds)
    const replyMap: Record<string, number> = {}
    for (const r of repliesData ?? []) {
      replyMap[r.thread_id] = (replyMap[r.thread_id] ?? 0) + 1
    }

    // Also fetch authors for popular threads
    const popAuthorIds = Array.from(new Set(weeklyThreads.map((t) => t.user_id).filter(Boolean)))
    const { data: popAuthors } = popAuthorIds.length
      ? await admin.from('profiles').select('id, full_name, username').in('id', popAuthorIds)
      : { data: [] }
    const popAuthorMap = Object.fromEntries((popAuthors ?? []).map((p) => [p.id, p]))

    popularThreads = [...weeklyThreads]
      .sort((a, b) => (replyMap[b.id] ?? 0) - (replyMap[a.id] ?? 0))
      .slice(0, 3)
      .map((t) => ({ ...t, replyCount: replyMap[t.id] ?? 0, profiles: popAuthorMap[t.user_id] ?? null }))
  }

  const profile = profileRes.data as Profile | null
  const displayName = profile?.full_name ?? profile?.username ?? user?.email?.split('@')[0] ?? 'גרפיקאי'

  let designerOfWeek: { userId: string; name: string; profile?: any } | null = null
  const dotWRaw = dotWRes.data?.value
  if (dotWRaw) {
    try {
      const parsed = typeof dotWRaw === 'string' ? JSON.parse(dotWRaw) : dotWRaw
      if (parsed?.userId) {
        const { data: dotWProfile } = await admin.from('profiles').select('id, full_name, username, avatar_url, specialization').eq('id', parsed.userId).single()
        designerOfWeek = { ...parsed, profile: dotWProfile }
      }
    } catch {}
  }

  return (
    <DashboardClient
      userId={user!.id}
      displayName={displayName}
      userForumPosts={userForumRes.count ?? 0}
      userPortfolioCount={userPortfolioRes.count ?? 0}
      initialUnreadMessages={unreadMsgRes.count ?? 0}
      initialRecentForum={recentForum}
      recentInspiration={recentInspiration}
      popularThreads={popularThreads}
      initialOpenJobs={(openJobsRes.data ?? []) as any[]}
      onlineDesigners={(onlineDesignersRes.data ?? []) as any[]}
      designerOfWeek={designerOfWeek}
    />
  )
}

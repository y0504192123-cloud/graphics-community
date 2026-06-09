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
    recentForumRes,
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
    admin.from('forum_threads').select('id, title, category_id, created_at, profiles(full_name, username, avatar_url)').order('created_at', { ascending: false }).limit(5),
    admin.from('inspiration_posts').select('id, title, image_url, created_at, profiles(full_name, username)').order('created_at', { ascending: false }).limit(4),
    admin.from('forum_threads').select('id, title, category_id, created_at, profiles(full_name, username)').gte('created_at', weekAgo).limit(20),
    admin.from('jobs').select('id, title, budget_min, budget_max, category, created_at').eq('status', 'open').order('created_at', { ascending: false }).limit(3),
    admin.from('profiles').select('id, full_name, username, avatar_url, specialization').gte('last_seen', fifteenMinsAgo).neq('id', user!.id).limit(6),
    admin.from('site_settings').select('value').eq('key', 'designer_of_week').single(),
  ])

  // Popular this week: sort weekly threads by reply count
  const weeklyThreads = (weeklyThreadsRes.data ?? []) as any[]
  const weeklyThreadIds = weeklyThreads.map((t) => t.id)
  let popularThreads: any[] = []
  if (weeklyThreadIds.length > 0) {
    const { data: repliesData } = await admin
      .from('forum_replies')
      .select('thread_id')
      .in('thread_id', weeklyThreadIds)
    const replyMap: Record<string, number> = {}
    for (const r of repliesData ?? []) {
      replyMap[r.thread_id] = (replyMap[r.thread_id] ?? 0) + 1
    }
    popularThreads = [...weeklyThreads]
      .sort((a, b) => (replyMap[b.id] ?? 0) - (replyMap[a.id] ?? 0))
      .slice(0, 3)
      .map((t) => ({ ...t, replyCount: replyMap[t.id] ?? 0 }))
  }

  const profile = profileRes.data as Profile | null
  const displayName = profile?.full_name ?? profile?.username ?? user?.email?.split('@')[0] ?? 'גרפיקאי'

  let designerOfWeek: { userId: string; name: string; profile?: any } | null = null
  const dotWRaw = dotWRes.data?.value
  if (dotWRaw) {
    try {
      const parsed = typeof dotWRaw === 'string' ? JSON.parse(dotWRaw) : dotWRaw
      if (parsed?.userId) {
        const { data: dotWProfile } = await admin.from('profiles').select('id, full_name, username, avatar_url, avatar_color, specialization').eq('id', parsed.userId).single()
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
      initialRecentForum={(recentForumRes.data ?? []) as any[]}
      recentInspiration={(recentInspirationRes.data ?? []) as any[]}
      popularThreads={popularThreads}
      initialOpenJobs={(openJobsRes.data ?? []) as any[]}
      onlineDesigners={(onlineDesignersRes.data ?? []) as any[]}
      designerOfWeek={designerOfWeek}
    />
  )
}

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Briefcase, Image as ImageIcon, MessageSquare, ArrowLeft, MessagesSquare, Users, ChevronLeft, Sparkles } from 'lucide-react'
import Link from 'next/link'
import type { Profile } from '@/types'

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

export default async function DashboardPage() {
  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()

  const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()

  const [
    profileRes,
    userForumRes,
    userPortfolioRes,
    unreadMsgRes,
    recentForumRes,
    recentInspirationRes,
    newMembersRes,
    openJobsRes,
    onlineDesignersRes,
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user!.id).single(),
    supabase.from('forum_threads').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
    supabase.from('portfolio_items').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
    supabase.from('private_messages').select('id', { count: 'exact', head: true }).eq('receiver_id', user!.id).eq('is_read', false),
    admin.from('forum_threads').select('id, title, category_id, created_at, profiles(full_name, username, avatar_url)').order('created_at', { ascending: false }).limit(5),
    admin.from('inspiration_posts').select('id, title, image_url, created_at, profiles(full_name, username)').order('created_at', { ascending: false }).limit(4),
    admin.from('profiles').select('id, full_name, username, avatar_url, specialization').order('created_at', { ascending: false }).limit(3),
    admin.from('jobs').select('id, title, budget_min, budget_max, category, created_at').eq('status', 'open').order('created_at', { ascending: false }).limit(3),
    admin.from('profiles').select('id, full_name, username, avatar_url, specialization').gte('last_seen', fifteenMinsAgo).neq('id', user!.id).limit(6),
  ])

  const profile = profileRes.data as Profile | null
  const userForumPosts = userForumRes.count ?? 0
  const userPortfolioCount = userPortfolioRes.count ?? 0
  const unreadMessages = unreadMsgRes.count ?? 0
  const recentForum = (recentForumRes.data ?? []) as any[]
  const recentInspiration = (recentInspirationRes.data ?? []) as any[]
  const newMembers = (newMembersRes.data ?? []) as any[]
  const openJobs = (openJobsRes.data ?? []) as any[]
  const onlineDesigners = (onlineDesignersRes.data ?? []) as any[]

  const displayName = profile?.full_name ?? profile?.username ?? user?.email?.split('@')[0] ?? 'גרפיקאי'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'בוקר טוב' : hour < 17 ? 'צהריים טובים' : 'ערב טוב'
  const profileIncomplete = !profile?.avatar_url || !profile?.bio

  return (
    <div className="min-h-full" style={{ background: 'var(--bg)' }}>

      {/* Hero + personal stats */}
      <div
        className="relative overflow-hidden px-6 pb-8 pt-8"
        style={{ background: 'var(--hero)' }}
      >
        <div className="pointer-events-none absolute -top-20 -start-20 h-80 w-80 rounded-full opacity-25" style={{ background: 'radial-gradient(circle, rgba(124,58,237,.6) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="pointer-events-none absolute -bottom-10 end-10 h-60 w-60 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, rgba(236,72,153,.5) 0%, transparent 70%)', filter: 'blur(50px)' }} />
        <div className="grid-pattern absolute inset-0" />

        <div className="relative mx-auto max-w-6xl">
          <div className="animate-fade-up">
            <p className="mb-1 text-sm font-medium text-purple-600">{greeting} ☀️</p>
            <h1 className="text-3xl font-bold lg:text-4xl" style={{ color: 'var(--tx)' }}>
              שלום,{' '}
              <Link href="/profile" className="gradient-text hover:opacity-80 transition-opacity">
                {displayName}
              </Link>
              !
            </h1>
          </div>

          {/* Personal stats */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Link
              href="/forum"
              className="group flex items-center gap-4 rounded-2xl p-4 transition-all duration-200 hover:scale-[1.02]"
              style={{ background: 'rgba(139,92,246,.1)', border: '1px solid rgba(139,92,246,.25)', boxShadow: '0 4px 16px rgba(139,92,246,.08)' }}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ background: 'rgba(139,92,246,.15)' }}>
                <MessagesSquare size={20} style={{ color: '#8b5cf6' }} />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: 'var(--tx)' }}>{userForumPosts}</p>
                <p className="text-xs" style={{ color: 'var(--tx3)' }}>פוסטים בפורום</p>
              </div>
            </Link>

            <Link
              href="/profile"
              className="group flex items-center gap-4 rounded-2xl p-4 transition-all duration-200 hover:scale-[1.02]"
              style={{ background: 'rgba(99,102,241,.1)', border: '1px solid rgba(99,102,241,.25)', boxShadow: '0 4px 16px rgba(99,102,241,.08)' }}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ background: 'rgba(99,102,241,.15)' }}>
                <ImageIcon size={20} style={{ color: '#6366f1' }} />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: 'var(--tx)' }}>{userPortfolioCount}</p>
                <p className="text-xs" style={{ color: 'var(--tx3)' }}>עבודות שהעליתי</p>
              </div>
            </Link>

            <Link
              href="/chat"
              className="group flex items-center gap-4 rounded-2xl p-4 transition-all duration-200 hover:scale-[1.02]"
              style={{ background: 'rgba(52,211,153,.08)', border: '1px solid rgba(52,211,153,.25)', boxShadow: '0 4px 16px rgba(52,211,153,.06)' }}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ background: 'rgba(52,211,153,.12)' }}>
                <MessageSquare size={20} style={{ color: '#34d399' }} />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: 'var(--tx)' }}>{unreadMessages}</p>
                <p className="text-xs" style={{ color: 'var(--tx3)' }}>הודעות שלא נקראו</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_272px]">

          {/* Community activity */}
          <div className="space-y-8">

            {/* Recent forum posts */}
            <section>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessagesSquare size={16} className="text-purple-400" />
                  <h2 className="text-sm font-bold" style={{ color: 'var(--tx)' }}>פוסטים חדשים בפורום</h2>
                </div>
                <Link href="/forum" className="text-xs font-semibold text-purple-500 hover:text-purple-600 transition-colors">
                  לכל הפוסטים →
                </Link>
              </div>
              <div className="overflow-hidden rounded-2xl" style={{ background: 'var(--s2)', border: '1px solid var(--bd)' }}>
                {recentForum.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <MessagesSquare size={24} style={{ color: 'var(--tx3)' }} />
                    <p className="text-sm" style={{ color: 'var(--tx3)' }}>אין פוסטים עדיין</p>
                  </div>
                ) : recentForum.map((thread: any, i: number) => (
                  <Link
                    key={thread.id}
                    href={`/forum/${thread.category_id}/${thread.id}`}
                    className="group flex items-center gap-3.5 px-5 py-3.5 transition hover:bg-purple-50/30"
                    style={{ borderTop: i > 0 ? '1px solid var(--bd)' : undefined }}
                  >
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-base"
                      style={{ background: 'rgba(124,58,237,.08)', border: '1px solid rgba(124,58,237,.1)' }}
                    >
                      💬
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold transition-colors group-hover:text-purple-600" style={{ color: 'var(--tx)' }}>
                        {thread.title}
                      </p>
                      <p className="mt-0.5 text-[11px]" style={{ color: 'var(--tx3)' }}>
                        {thread.profiles?.full_name ?? thread.profiles?.username ?? 'משתמש'} · {fmtDate(thread.created_at)}
                      </p>
                    </div>
                    <ChevronLeft size={13} className="shrink-0 text-slate-300 transition-colors group-hover:text-purple-400" />
                  </Link>
                ))}
              </div>
            </section>

            {/* Recent inspiration posts */}
            <section>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-purple-400" />
                  <h2 className="text-sm font-bold" style={{ color: 'var(--tx)' }}>עבודות חדשות בספריית ההשראה</h2>
                </div>
                <Link href="/inspiration" className="text-xs font-semibold text-purple-500 hover:text-purple-600 transition-colors">
                  לכל העבודות →
                </Link>
              </div>
              {recentInspiration.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-2xl py-8 text-center" style={{ border: '1px solid var(--bd)', background: 'var(--s2)' }}>
                  <Sparkles size={24} style={{ color: 'var(--tx3)' }} />
                  <p className="text-sm" style={{ color: 'var(--tx3)' }}>אין עבודות עדיין</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {recentInspiration.map((post: any) => (
                    <Link
                      key={post.id}
                      href={`/inspiration/${post.id}`}
                      className="group overflow-hidden rounded-2xl transition-all duration-200 hover:-translate-y-1"
                      style={{ background: 'var(--s2)', border: '1px solid var(--bd)', boxShadow: '0 2px 8px rgba(0,0,0,.15)' }}
                    >
                      {post.image_url && (
                        <div className="aspect-square w-full overflow-hidden">
                          <img
                            src={post.image_url}
                            alt={post.title}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>
                      )}
                      <div className="p-2.5">
                        <p className="truncate text-xs font-semibold" style={{ color: 'var(--tx)' }}>{post.title}</p>
                        <p className="mt-0.5 truncate text-[10px]" style={{ color: 'var(--tx3)' }}>
                          {post.profiles?.full_name ?? post.profiles?.username ?? 'גרפיקאי'}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* New members */}
            <section>
              <div className="mb-4 flex items-center gap-2">
                <Users size={16} className="text-purple-400" />
                <h2 className="text-sm font-bold" style={{ color: 'var(--tx)' }}>גרפיקאים חדשים שהצטרפו</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {newMembers.map((member: any) => (
                  <Link
                    key={member.id}
                    href={`/profile/${member.id}`}
                    className="group flex items-center gap-3 rounded-2xl p-3.5 transition-all duration-200 hover:scale-[1.02]"
                    style={{ background: 'var(--s2)', border: '1px solid var(--bd)', boxShadow: '0 2px 8px rgba(0,0,0,.1)' }}
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold overflow-hidden"
                      style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: 'white' }}
                    >
                      {member.avatar_url ? (
                        <img src={member.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <span style={{ color: 'white' }}>{(member.full_name ?? member.username ?? '?').charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold" style={{ color: 'var(--tx)' }}>
                        {member.full_name ?? member.username ?? 'גרפיקאי'}
                      </p>
                      <p className="truncate text-[11px]" style={{ color: 'var(--tx3)' }}>
                        {member.specialization ?? 'גרפיקאי'}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar: open jobs + online designers */}
          <div className="space-y-6">

            {/* Open jobs */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Briefcase size={15} style={{ color: '#6366f1' }} />
                  <h3 className="text-sm font-bold" style={{ color: 'var(--tx)' }}>עבודות פתוחות</h3>
                </div>
                <Link href="/jobs" className="text-xs font-semibold text-purple-500 hover:text-purple-600 transition-colors">
                  כולן →
                </Link>
              </div>
              <div className="space-y-2">
                {openJobs.length === 0 ? (
                  <p className="py-4 text-center text-xs" style={{ color: 'var(--tx3)' }}>אין עבודות פתוחות</p>
                ) : openJobs.map((job: any) => (
                  <Link
                    key={job.id}
                    href="/jobs"
                    className="group block rounded-2xl p-3.5 transition-all duration-200 hover:scale-[1.01]"
                    style={{ background: 'var(--s2)', border: '1px solid var(--bd)' }}
                  >
                    <p className="line-clamp-1 text-sm font-semibold transition-colors group-hover:text-purple-600" style={{ color: 'var(--tx)' }}>
                      {job.title}
                    </p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      {job.category && (
                        <span className="text-[10px]" style={{ color: 'var(--tx3)' }}>{job.category}</span>
                      )}
                      {(job.budget_min || job.budget_max) && (
                        <span className="text-[10px] font-semibold text-green-600">
                          ₪{job.budget_min ?? 0}–{job.budget_max ?? '?'}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Online designers */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                <h3 className="text-sm font-bold" style={{ color: 'var(--tx)' }}>מחוברים עכשיו</h3>
              </div>
              <div className="space-y-2">
                {onlineDesigners.length === 0 ? (
                  <p className="py-4 text-center text-xs" style={{ color: 'var(--tx3)' }}>אין גרפיקאים מחוברים כעת</p>
                ) : onlineDesigners.map((designer: any) => (
                  <Link
                    key={designer.id}
                    href={`/profile/${designer.id}`}
                    className="group flex items-center gap-3 rounded-xl p-2.5 transition-all hover:bg-slate-100/50"
                    style={{ border: '1px solid var(--bd)' }}
                  >
                    <div className="relative shrink-0">
                      <div
                        className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full text-xs font-bold"
                        style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: 'white' }}
                      >
                        {designer.avatar_url ? (
                          <img src={designer.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <span style={{ color: 'white' }}>{(designer.full_name ?? designer.username ?? '?').charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <span
                        className="absolute -bottom-0.5 -end-0.5 h-2.5 w-2.5 rounded-full border-2 bg-emerald-400"
                        style={{ borderColor: 'var(--s1)' }}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold" style={{ color: 'var(--tx)' }}>
                        {designer.full_name ?? designer.username ?? 'גרפיקאי'}
                      </p>
                      {designer.specialization && (
                        <p className="truncate text-[10px]" style={{ color: 'var(--tx3)' }}>{designer.specialization}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Profile completion */}
            {profileIncomplete && (
              <div
                className="rounded-2xl p-4"
                style={{ background: 'rgba(234,179,8,.08)', border: '1px solid rgba(234,179,8,.25)' }}
              >
                <p className="text-sm font-semibold text-amber-700">השלם את הפרופיל שלך</p>
                <p className="mt-1 text-xs" style={{ color: 'var(--tx3)' }}>
                  {!profile?.avatar_url && !profile?.bio
                    ? 'חסרה תמונת פרופיל ו-bio'
                    : !profile?.avatar_url
                    ? 'חסרה תמונת פרופיל'
                    : 'חסר bio'}
                </p>
                <Link
                  href="/profile"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-amber-700 transition hover:text-amber-800"
                >
                  עדכן עכשיו <ArrowLeft size={11} />
                </Link>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

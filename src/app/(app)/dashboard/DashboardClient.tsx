'use client'

import { useEffect, useMemo, useState } from 'react'
import { Briefcase, Image as ImageIcon, MessageSquare, MessagesSquare, ChevronLeft, Sparkles, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useT, useLanguage } from '@/components/LanguageProvider'
import type { Profile } from '@/types'

type DashboardProps = {
  userId: string
  displayName: string
  userForumPosts: number
  userPortfolioCount: number
  initialUnreadMessages: number
  initialRecentForum: any[]
  recentInspiration: any[]
  popularThreads: any[]
  initialOpenJobs: any[]
  onlineDesigners: any[]
  designerOfWeek: { userId: string; name: string; profile?: any } | null
}

export default function DashboardClient({
  userId, displayName,
  userForumPosts, userPortfolioCount,
  initialUnreadMessages, initialRecentForum,
  recentInspiration, popularThreads,
  initialOpenJobs, onlineDesigners,
  designerOfWeek,
}: DashboardProps) {
  const t = useT()
  const { lang } = useLanguage()
  const supabase = useMemo(() => createClient(), [])

  const [unreadMessages, setUnreadMessages] = useState(initialUnreadMessages)
  const [recentForum, setRecentForum] = useState<any[]>(initialRecentForum)
  const [openJobs, setOpenJobs] = useState<any[]>(initialOpenJobs)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? t.dashboard.greetingMorning : hour < 17 ? t.dashboard.greetingAfternoon : t.dashboard.greetingEvening

  function fmtDate(iso: string) {
    const diffMs = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diffMs / 60000)
    if (mins < 1) return t.dashboard.now
    if (lang === 'he') {
      if (mins < 60) return `לפני ${mins} דק׳`
      const hrs = Math.floor(mins / 60)
      if (hrs < 24) return `לפני ${hrs} שע׳`
      const days = Math.floor(hrs / 24)
      if (days < 7) return `לפני ${days} ימים`
      return new Date(iso).toLocaleDateString('he-IL')
    } else {
      if (mins < 60) return `${mins}m ago`
      const hrs = Math.floor(mins / 60)
      if (hrs < 24) return `${hrs}h ago`
      const days = Math.floor(hrs / 24)
      if (days < 7) return `${days}d ago`
      return new Date(iso).toLocaleDateString('en-US')
    }
  }

  useEffect(() => {
    // Subscribe to new forum threads
    const forumCh = supabase.channel('db-forum-threads')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'forum_threads' }, async (payload) => {
        const thread = payload.new as any
        const { data: prof } = await supabase
          .from('profiles').select('full_name, username').eq('id', thread.user_id).single()
        setRecentForum(prev => [{ ...thread, profiles: prof ?? null }, ...prev.slice(0, 4)])
      })
      .subscribe()

    // Subscribe to new private messages addressed to this user
    const msgCh = supabase.channel('db-pm-inbox')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'private_messages',
        filter: `receiver_id=eq.${userId}`,
      }, (payload) => {
        if (!(payload.new as any).is_read) {
          setUnreadMessages(prev => prev + 1)
        }
      })
      .subscribe()

    // Subscribe to new open jobs
    const jobsCh = supabase.channel('db-new-jobs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'jobs' }, (payload) => {
        const job = payload.new as any
        if (job.status === 'open') {
          setOpenJobs(prev => [job, ...prev.slice(0, 2)])
        }
      })
      .subscribe()

    return () => {
      forumCh.unsubscribe()
      msgCh.unsubscribe()
      jobsCh.unsubscribe()
    }
  }, [userId, supabase])

  return (
    <div className="min-h-full" style={{ background: 'var(--bg)' }}>

      {/* Hero + personal stats */}
      <div className="relative overflow-hidden px-6 pb-8 pt-8" style={{ background: 'var(--hero)' }}>
        <div className="pointer-events-none absolute -top-20 -start-20 h-80 w-80 rounded-full opacity-25"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,.6) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="pointer-events-none absolute -bottom-10 end-10 h-60 w-60 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, rgba(236,72,153,.5) 0%, transparent 70%)', filter: 'blur(50px)' }} />
        <div className="grid-pattern absolute inset-0" />

        <div className="relative mx-auto max-w-6xl">
          <div className="animate-fade-up">
            <p className="mb-1 text-sm font-medium text-purple-600">{greeting} ☀️</p>
            <h1 className="text-3xl font-bold lg:text-4xl" style={{ color: 'var(--tx)' }}>
              {t.dashboard.hello},{' '}
              <Link href="/profile" className="gradient-text hover:opacity-80 transition-opacity">
                {displayName}
              </Link>
              !
            </h1>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Link href="/forum"
              className="group flex items-center gap-4 rounded-2xl p-4 transition-all duration-200 hover:scale-[1.02]"
              style={{ background: 'rgba(139,92,246,.1)', border: '1px solid rgba(139,92,246,.25)', boxShadow: '0 4px 16px rgba(139,92,246,.08)' }}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ background: 'rgba(139,92,246,.15)' }}>
                <MessagesSquare size={20} style={{ color: '#8b5cf6' }} />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: 'var(--tx)' }}>{userForumPosts}</p>
                <p className="text-xs" style={{ color: 'var(--tx3)' }}>{t.dashboard.myForumPosts}</p>
              </div>
            </Link>

            <Link href="/profile"
              className="group flex items-center gap-4 rounded-2xl p-4 transition-all duration-200 hover:scale-[1.02]"
              style={{ background: 'rgba(99,102,241,.1)', border: '1px solid rgba(99,102,241,.25)', boxShadow: '0 4px 16px rgba(99,102,241,.08)' }}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ background: 'rgba(99,102,241,.15)' }}>
                <ImageIcon size={20} style={{ color: '#6366f1' }} />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: 'var(--tx)' }}>{userPortfolioCount}</p>
                <p className="text-xs" style={{ color: 'var(--tx3)' }}>{t.dashboard.myWorks}</p>
              </div>
            </Link>

            <Link href="/chat"
              className="group flex items-center gap-4 rounded-2xl p-4 transition-all duration-200 hover:scale-[1.02]"
              style={{ background: 'rgba(52,211,153,.08)', border: '1px solid rgba(52,211,153,.25)', boxShadow: '0 4px 16px rgba(52,211,153,.06)' }}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ background: 'rgba(52,211,153,.12)' }}>
                <MessageSquare size={20} style={{ color: '#34d399' }} />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: 'var(--tx)' }}>{unreadMessages}</p>
                <p className="text-xs" style={{ color: 'var(--tx3)' }}>{t.dashboard.unreadMessages}</p>
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
                  <h2 className="text-sm font-bold" style={{ color: 'var(--tx)' }}>{t.dashboard.recentForum}</h2>
                </div>
                <Link href="/forum" className="text-xs font-semibold text-purple-500 hover:text-purple-600 transition-colors">
                  {t.dashboard.allPosts}
                </Link>
              </div>
              <div className="overflow-hidden rounded-2xl" style={{ background: 'var(--s2)', border: '1px solid var(--bd)' }}>
                {recentForum.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <MessagesSquare size={24} style={{ color: 'var(--tx3)' }} />
                    <p className="text-sm" style={{ color: 'var(--tx3)' }}>{t.dashboard.noForumPosts}</p>
                  </div>
                ) : recentForum.map((thread: any, i: number) => (
                  <Link key={thread.id} href={`/forum/${thread.category_id}/${thread.id}`}
                    className="group flex items-center gap-3.5 px-5 py-3.5 transition hover:bg-purple-50/30"
                    style={{ borderTop: i > 0 ? '1px solid var(--bd)' : undefined }}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-base"
                      style={{ background: 'rgba(124,58,237,.08)', border: '1px solid rgba(124,58,237,.1)' }}>
                      💬
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold transition-colors group-hover:text-purple-600" style={{ color: 'var(--tx)' }}>
                        {thread.title}
                      </p>
                      <p className="mt-0.5 text-[11px]" style={{ color: 'var(--tx3)' }}>
                        {thread.profiles?.full_name ?? thread.profiles?.username ?? t.dashboard.user} · {fmtDate(thread.created_at)}
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
                  <h2 className="text-sm font-bold" style={{ color: 'var(--tx)' }}>{t.dashboard.recentInspiration}</h2>
                </div>
                <Link href="/inspiration" className="text-xs font-semibold text-purple-500 hover:text-purple-600 transition-colors">
                  {t.dashboard.allWorks}
                </Link>
              </div>
              {recentInspiration.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-2xl py-8 text-center" style={{ border: '1px solid var(--bd)', background: 'var(--s2)' }}>
                  <Sparkles size={24} style={{ color: 'var(--tx3)' }} />
                  <p className="text-sm" style={{ color: 'var(--tx3)' }}>{t.dashboard.noWorks}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {recentInspiration.map((post: any) => (
                    <Link key={post.id} href={`/inspiration/${post.id}`}
                      className="group overflow-hidden rounded-2xl transition-all duration-200 hover:-translate-y-1"
                      style={{ background: 'var(--s2)', border: '1px solid var(--bd)', boxShadow: '0 2px 8px rgba(0,0,0,.15)' }}
                    >
                      {post.image_url && (
                        <div className="aspect-square w-full overflow-hidden">
                          <img src={post.image_url} alt={post.title}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                        </div>
                      )}
                      <div className="p-2.5">
                        <p className="truncate text-xs font-semibold" style={{ color: 'var(--tx)' }}>{post.title}</p>
                        <p className="mt-0.5 truncate text-[10px]" style={{ color: 'var(--tx3)' }}>
                          {post.profiles?.full_name ?? post.profiles?.username ?? t.dashboard.designer}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* Popular this week */}
            <section>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-purple-400" />
                  <h2 className="text-sm font-bold" style={{ color: 'var(--tx)' }}>{t.dashboard.popularThisWeek}</h2>
                </div>
                <Link href="/forum" className="text-xs font-semibold text-purple-500 hover:text-purple-600 transition-colors">
                  {t.dashboard.toForum}
                </Link>
              </div>
              <div className="overflow-hidden rounded-2xl" style={{ background: 'var(--s2)', border: '1px solid var(--bd)' }}>
                {popularThreads.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <TrendingUp size={24} style={{ color: 'var(--tx3)' }} />
                    <p className="text-sm" style={{ color: 'var(--tx3)' }}>{t.dashboard.noDiscussions}</p>
                  </div>
                ) : popularThreads.map((thread: any, i: number) => (
                  <Link key={thread.id} href={`/forum/${thread.category_id}/${thread.id}`}
                    className="group flex items-center gap-3.5 px-5 py-3.5 transition hover:bg-purple-50/30"
                    style={{ borderTop: i > 0 ? '1px solid var(--bd)' : undefined }}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
                      style={{ background: i < 3 ? 'rgba(124,58,237,.08)' : 'var(--inp)', color: i < 3 ? '#7c3aed' : 'var(--tx3)', border: '1px solid var(--bd)' }}>
                      {['🥇', '🥈', '🥉'][i] ?? i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold transition-colors group-hover:text-purple-600" style={{ color: 'var(--tx)' }}>
                        {thread.title}
                      </p>
                      <p className="mt-0.5 text-[11px]" style={{ color: 'var(--tx3)' }}>
                        {thread.profiles?.full_name ?? thread.profiles?.username ?? t.dashboard.user} · {fmtDate(thread.created_at)}
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-purple-600">
                      <MessagesSquare size={11} />
                      {thread.replyCount}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">

            {designerOfWeek?.profile && (
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-amber-500">🏆</span>
                  <h3 className="text-sm font-bold" style={{ color: 'var(--tx)' }}>{t.dashboard.designerOfWeek}</h3>
                </div>
                <Link href={`/profile/${designerOfWeek.userId}`}
                  className="flex items-center gap-3 rounded-2xl p-4 transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, rgba(251,191,36,.12), rgba(245,158,11,.08))', border: '1px solid rgba(251,191,36,.3)' }}
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full font-bold text-sm"
                    style={{ background: designerOfWeek.profile.avatar_color ?? 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white' }}>
                    {designerOfWeek.profile.avatar_url
                      ? <img src={designerOfWeek.profile.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
                      : (designerOfWeek.profile.full_name ?? designerOfWeek.profile.username ?? '?').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm" style={{ color: 'var(--tx)' }}>{designerOfWeek.profile.full_name ?? designerOfWeek.profile.username}</p>
                    {designerOfWeek.profile.specialization && (
                      <p className="truncate text-xs" style={{ color: 'var(--tx3)' }}>{designerOfWeek.profile.specialization}</p>
                    )}
                  </div>
                  <span className="ms-auto text-xl">🌟</span>
                </Link>
              </div>
            )}

            {/* Open jobs */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Briefcase size={15} style={{ color: '#6366f1' }} />
                  <h3 className="text-sm font-bold" style={{ color: 'var(--tx)' }}>{t.dashboard.openJobs}</h3>
                </div>
                <Link href="/jobs" className="text-xs font-semibold text-purple-500 hover:text-purple-600 transition-colors">
                  {t.dashboard.allJobs}
                </Link>
              </div>
              <div className="space-y-2">
                {openJobs.length === 0 ? (
                  <p className="py-4 text-center text-xs" style={{ color: 'var(--tx3)' }}>{t.dashboard.noJobs}</p>
                ) : openJobs.map((job: any) => (
                  <Link key={job.id} href="/jobs"
                    className="group block rounded-2xl p-3.5 transition-all duration-200 hover:scale-[1.01]"
                    style={{ background: 'var(--s2)', border: '1px solid var(--bd)' }}
                  >
                    <p className="line-clamp-1 text-sm font-semibold transition-colors group-hover:text-purple-600" style={{ color: 'var(--tx)' }}>
                      {job.title}
                    </p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      {job.category && <span className="text-[10px]" style={{ color: 'var(--tx3)' }}>{job.category}</span>}
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
                <h3 className="text-sm font-bold" style={{ color: 'var(--tx)' }}>{t.dashboard.onlineNow}</h3>
              </div>
              <div className="space-y-2">
                {onlineDesigners.length === 0 ? (
                  <p className="py-4 text-center text-xs" style={{ color: 'var(--tx3)' }}>{t.dashboard.noOnline}</p>
                ) : onlineDesigners.map((designer: any) => (
                  <Link key={designer.id} href={`/profile/${designer.id}`}
                    className="group flex items-center gap-3 rounded-xl p-2.5 transition-all hover:bg-slate-100/50"
                    style={{ border: '1px solid var(--bd)' }}
                  >
                    <div className="relative shrink-0">
                      <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full text-xs font-bold"
                        style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: 'white' }}>
                        {designer.avatar_url
                          ? <img src={designer.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                          : <span style={{ color: 'white' }}>{(designer.full_name ?? designer.username ?? '?').charAt(0).toUpperCase()}</span>
                        }
                      </div>
                      <span className="absolute -bottom-0.5 -end-0.5 h-2.5 w-2.5 rounded-full border-2 bg-emerald-400"
                        style={{ borderColor: 'var(--s1)' }} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold" style={{ color: 'var(--tx)' }}>
                        {designer.full_name ?? designer.username ?? t.dashboard.designer}
                      </p>
                      {designer.specialization && (
                        <p className="truncate text-[10px]" style={{ color: 'var(--tx3)' }}>{designer.specialization}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

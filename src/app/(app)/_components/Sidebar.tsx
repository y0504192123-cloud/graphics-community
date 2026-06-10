'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Briefcase, MessageSquare, Library, Menu, X, ShieldCheck, Palette, Globe, MessagesSquare, ScanText, Info, Settings, Newspaper, Search, Users } from 'lucide-react'
import { useState, useEffect, useMemo, useRef } from 'react'
import LogoutButton from './LogoutButton'
import { useLanguage, useT } from '@/components/LanguageProvider'
import { createClient } from '@/lib/supabase/client'
import { playPing, resumeAudio } from '@/lib/sound'
import type { Profile } from '@/types'

type NavItem = { href: string; label: string; icon: React.ReactNode }
type Props = { profile: Profile | null; email: string; currentUserId?: string; logoUrl?: string | null }

export default function Sidebar({ profile, email, currentUserId, logoUrl }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { lang, toggleLang } = useLanguage()
  const t = useT()
  const [unreadCount, setUnreadCount] = useState(0)
  const [communityUnreadCount, setCommunityUnreadCount] = useState(0)
  const [newsUnreadCount, setNewsUnreadCount] = useState(0)
  const [forumUnreadCount, setForumUnreadCount] = useState(0)
  const [totalMembers, setTotalMembers] = useState(0)
  const [onlineCount, setOnlineCount] = useState(0)
  const supabase = useMemo(() => createClient(), [])
  const prevPmRef = useRef<number | null>(null)
  const prevForumRef = useRef<number | null>(null)

  useEffect(() => {
    document.addEventListener('click', resumeAudio)
    return () => document.removeEventListener('click', resumeAudio)
  }, [])

  // Community chat unread badge — driven by custom events from ChatClient
  useEffect(() => {
    if (!currentUserId) return
    const onMsg = () => setCommunityUnreadCount(prev => prev + 1)
    const onOpened = () => setCommunityUnreadCount(0)
    window.addEventListener('new-community-msg', onMsg)
    window.addEventListener('community-opened', onOpened)
    return () => {
      window.removeEventListener('new-community-msg', onMsg)
      window.removeEventListener('community-opened', onOpened)
    }
  }, [currentUserId])

  useEffect(() => {
    if (!currentUserId) return
    const fetchCount = async () => {
      const { count, error } = await supabase
        .from('private_messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', currentUserId)
        .eq('is_read', false)
      console.log('[Sidebar] PM count:', count, error?.message ?? '')
      const newCount = count ?? 0
      if (prevPmRef.current !== null && newCount > prevPmRef.current) playPing()
      prevPmRef.current = newCount
      setUnreadCount(newCount)
    }
    fetchCount()

    let ch: ReturnType<typeof supabase.channel> | null = null
    let timer: ReturnType<typeof setTimeout> | null = null
    let cancelled = false

    const connect = () => {
      if (cancelled) return
      if (ch) supabase.removeChannel(ch)
      ch = supabase.channel(`sidebar-pm-${currentUserId}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'private_messages',
          filter: `receiver_id=eq.${currentUserId}`,
        }, (payload) => {
          window.dispatchEvent(new CustomEvent('new-pm', { detail: payload.new }))
          fetchCount()
        })
        .subscribe((status) => {
          if (!cancelled && (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT')) {
            if (timer) clearTimeout(timer)
            timer = setTimeout(connect, 5_000)
          }
        })
    }
    connect()

    const onRead = () => fetchCount()
    window.addEventListener('pm-read', onRead)
    const poll = setInterval(fetchCount, 30_000)

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      if (ch) supabase.removeChannel(ch)
      window.removeEventListener('pm-read', onRead)
      clearInterval(poll)
    }
  }, [currentUserId, supabase])

  useEffect(() => {
    if (!currentUserId) return
    const fetchForumCount = async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', currentUserId)
        .eq('type', 'forum_reply')
        .eq('is_read', false)
      console.log('[Sidebar] Forum count:', count, error?.message ?? '')
      const newCount = count ?? 0
      if (prevForumRef.current !== null && newCount > prevForumRef.current) playPing()
      prevForumRef.current = newCount
      setForumUnreadCount(newCount)
    }
    fetchForumCount()

    const poll = setInterval(fetchForumCount, 30_000)
    return () => clearInterval(poll)
  }, [currentUserId, supabase])

  useEffect(() => {
    if (!currentUserId) return
    const fetchNewsCount = async () => {
      const since = localStorage.getItem('last_read_news_at') ?? '2000-01-01T00:00:00Z'
      const { count } = await supabase
        .from('news')
        .select('id', { count: 'exact', head: true })
        .gt('created_at', since)
      setNewsUnreadCount(count ?? 0)
    }
    fetchNewsCount()
    const poll = setInterval(fetchNewsCount, 60_000)
    return () => clearInterval(poll)
  }, [currentUserId, supabase])

  useEffect(() => {
    if (!currentUserId) return
    const updateLastSeen = () => {
      supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', currentUserId).then(() => {})
    }
    updateLastSeen()
    const interval = setInterval(updateLastSeen, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [currentUserId, supabase])

  useEffect(() => {
    if (!currentUserId) return
    const fetchMemberCounts = async () => {
      const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()
      const [totalRes, onlineRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'active').gte('last_seen', fifteenMinsAgo),
      ])
      setTotalMembers(totalRes.count ?? 0)
      if (!onlineRes.error) setOnlineCount(onlineRes.count ?? 0)
    }
    fetchMemberCounts()
    const interval = setInterval(fetchMemberCounts, 60 * 1000)
    return () => clearInterval(interval)
  }, [currentUserId, supabase])

  const navItems: NavItem[] = [
    { href: '/dashboard',        label: t.nav.home,        icon: <LayoutDashboard size={17} /> },
    { href: '/jobs',             label: t.nav.jobs,        icon: <Briefcase size={17} /> },
    { href: '/chat',             label: t.nav.chat,        icon: <MessageSquare size={17} /> },
    { href: '/forum',            label: t.nav.forum,       icon: <MessagesSquare size={17} /> },
    { href: '/inspiration',      label: t.nav.inspiration, icon: <Palette size={17} /> },
    { href: '/assets',           label: t.nav.assets,      icon: <Library size={17} /> },
    { href: '/font-identifier',  label: t.nav.fontId,      icon: <ScanText size={17} /> },
    { href: '/news',             label: t.nav.news,        icon: <Newspaper size={17} /> },
    { href: '/members',          label: t.nav.members,     icon: <Users size={17} /> },
  ]

  const displayName = profile?.full_name ?? profile?.username ?? email.split('@')[0]
  const initials = displayName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

  const sidebarContent = (
    <div className="flex h-full flex-col overflow-hidden">

      {/* Logo */}
      {logoUrl && (
        <div className="px-4 pb-4 pt-5">
          <img src={logoUrl} alt="Grafi" className="max-w-[160px] object-contain" style={{ maxHeight: '48px' }} />
        </div>
      )}

      <div className="mx-4 mb-3 h-px" style={{ background: 'var(--bd)' }} />

      {/* Search */}
      <div className="mx-3 mb-2">
        <form onSubmit={e => { e.preventDefault(); if (searchQuery.trim()) { router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`); setOpen(false) } }}>
          <div className="relative">
            <Search size={13} className="absolute end-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--tx3)' }} />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t.nav.search}
              className="w-full rounded-xl pe-3 ps-8 py-2 text-xs outline-none transition"
              style={{ background: 'var(--inp)', border: '1px solid var(--bd)', color: 'var(--tx)' }}
            />
          </div>
        </form>
      </div>

      {/* Member counter */}
      {totalMembers > 0 && (
        <div className="mx-3 mb-3 flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs" style={{ background: 'var(--s2)', border: '1px solid var(--bd)' }}>
          <span style={{ color: 'var(--tx2)' }}>{totalMembers} {t.sidebar.members}</span>
          <span style={{ color: 'var(--tx3)' }}>|</span>
          <span className="flex items-center gap-1" style={{ color: '#10b981' }}>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {onlineCount} {t.sidebar.online}
          </span>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-3">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          const isChat = item.href === '/chat'
          const isForum = item.href === '/forum'
          const isNews = item.href === '/news'
          const numBadge = isChat ? (unreadCount + communityUnreadCount) : isNews ? newsUnreadCount : isForum ? forumUnreadCount : 0
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200"
              style={{
                color: active ? '#6b21a8' : 'var(--tx2)',
                background: active ? 'rgba(107,33,168,.08)' : 'transparent',
                border: active ? '1px solid rgba(107,33,168,.15)' : '1px solid transparent',
              }}
            >
              {!active && (
                <span className="absolute inset-0 rounded-xl transition-all duration-200 group-hover:bg-slate-100" />
              )}
              {active && (
                <span className="absolute end-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-s-full bg-purple-600" />
              )}
              <span
                className="relative transition-colors duration-200"
                style={{ color: active ? '#7c3aed' : 'var(--tx3)' }}
              >
                {item.icon}
              </span>
              <span className="relative" style={{ color: active ? '#6b21a8' : 'var(--tx2)' }}>{item.label}</span>
              {numBadge > 0 && (
                <span className="relative ms-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                  {numBadge > 9 ? '9+' : numBadge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Admin link */}
      {profile?.role === 'admin' && (
        <div className="mx-3 mb-1 mt-1">
          <Link
            href="/admin"
            onClick={() => setOpen(false)}
            className="group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200"
            style={{
              color: pathname.startsWith('/admin') ? '#be185d' : 'var(--tx2)',
              background: pathname.startsWith('/admin') ? 'rgba(236,72,153,.08)' : 'transparent',
              border: pathname.startsWith('/admin') ? '1px solid rgba(236,72,153,.18)' : '1px solid transparent',
            }}
          >
            {!pathname.startsWith('/admin') && (
              <span className="absolute inset-0 rounded-xl transition-all duration-200 group-hover:bg-slate-100" />
            )}
            {pathname.startsWith('/admin') && (
              <span className="absolute end-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-s-full bg-pink-500" />
            )}
            <span className="relative" style={{ color: pathname.startsWith('/admin') ? '#ec4899' : 'var(--tx3)' }}>
              <ShieldCheck size={17} />
            </span>
            <span className="relative">{t.nav.admin}</span>
          </Link>
        </div>
      )}

      {/* Language toggle */}
      <div className="mx-3 mb-1 mt-1">
        <button
          onClick={toggleLang}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 hover:bg-slate-100"
          style={{ border: '1px solid var(--bd)', background: 'var(--inp)', color: 'var(--tx2)' }}
        >
          <Globe size={15} className="shrink-0" style={{ color: '#3b82f6' }} />
          <span>{lang === 'he' ? 'English' : 'עברית'}</span>

          <span
            className="me-auto rounded-full px-2 py-0.5 text-[10px] font-bold"
            style={{ background: 'rgba(59,130,246,.1)', color: '#3b82f6' }}
          >
            {lang === 'he' ? 'HE' : 'EN'}
          </span>
        </button>
      </div>

      <div className="mx-4 mb-2 h-px" style={{ background: 'var(--bd)' }} />

      {/* User → profile */}
      <div className="p-3">
        <Link
          href="/profile"
          onClick={() => setOpen(false)}
          className="mb-1 flex items-center gap-3 rounded-xl p-2.5 transition-all hover:bg-slate-100"
        >
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-sm"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: 'white' }}
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={displayName} className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <span style={{ color: 'white' }}>{initials}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold" style={{ color: 'var(--tx)' }}>{displayName}</p>
            <p className="truncate text-[11px]" style={{ color: 'var(--tx3)' }}>{profile?.specialization ?? t.nav.designer}</p>
          </div>
        </Link>
        <div className="mt-1 flex gap-1">
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-medium transition hover:bg-slate-100"
            style={{ color: 'var(--tx3)', border: '1px solid var(--bd)' }}
          >
            <Settings size={13} />
            {t.nav.settings}
          </Link>
          <Link
            href="/about"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition hover:bg-slate-100"
            style={{ color: 'var(--tx3)', border: '1px solid var(--bd)' }}
          >
            <Info size={13} />
          </Link>
          <LogoutButton compact />
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden h-screen w-60 shrink-0 flex-col lg:flex"
        style={{ background: 'var(--s1)', borderInlineStart: '1px solid var(--bd)', boxShadow: '1px 0 0 var(--bd)' }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile top bar */}
      <div
        className="fixed inset-x-0 top-0 z-40 flex items-center justify-between px-4 py-3 lg:hidden"
        style={{ background: 'var(--hdr)', borderBottom: '1px solid var(--bd)', backdropFilter: 'blur(20px)' }}
      >
        <div className="flex items-center gap-2.5">
          {logoUrl && (
            <img src={logoUrl} alt="Grafi" className="max-w-[120px] object-contain" style={{ maxHeight: '48px' }} />
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleLang}
            className="rounded-lg px-2 py-1 text-xs font-bold transition hover:bg-slate-100"
            style={{ color: '#3b82f6', border: '1px solid var(--bd)' }}
          >
            {lang === 'he' ? 'EN' : 'עב'}
          </button>
          <button
            onClick={() => setOpen((o) => !o)}
            className="relative rounded-lg p-1.5 transition hover:bg-slate-100"
            style={{ color: 'var(--tx2)' }}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
            {!open && (unreadCount + communityUnreadCount + forumUnreadCount) > 0 && (
              <span className="absolute -end-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold" style={{ color: 'white' }}>
                {(unreadCount + communityUnreadCount + forumUnreadCount) > 9 ? '9+' : unreadCount + communityUnreadCount + forumUnreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />
          <aside
            className="fixed inset-y-0 end-0 z-50 w-64 lg:hidden"
            style={{ background: 'var(--s1)', borderInlineStart: '1px solid var(--bd)' }}
          >
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  )
}

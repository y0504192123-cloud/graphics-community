'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Briefcase, MessageSquare, Library, Menu, X, Sparkles, ShieldCheck, Palette, Globe } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import LogoutButton from './LogoutButton'
import { useLanguage } from '@/components/LanguageProvider'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

type NavItem = { href: string; label: string; icon: React.ReactNode }
type Props = { profile: Profile | null; email: string; currentUserId?: string }

const labels = {
  he: {
    home: 'ראשי', jobs: 'לוח עבודות', chat: "צ'אטים",
    inspiration: 'ספריית השראה', assets: 'נכסים', admin: 'פאנל ניהול',
    appName: 'גרפיקס קהילה', appSub: 'פלטפורמה לגרפיקאים', designer: 'גרפיקאי',
  },
  en: {
    home: 'Home', jobs: 'Job Board', chat: 'Chats',
    inspiration: 'Inspiration', assets: 'Assets', admin: 'Admin Panel',
    appName: 'Graphics Community', appSub: 'Platform for Designers', designer: 'Designer',
  },
}

export default function Sidebar({ profile, email, currentUserId }: Props) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const { lang, toggleLang } = useLanguage()
  const t = labels[lang]
  const [unreadCount, setUnreadCount] = useState(0)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    if (!currentUserId) return
    const fetchCount = async () => {
      const { count } = await supabase
        .from('private_messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', currentUserId)
        .eq('is_read', false)
      setUnreadCount(count ?? 0)
    }
    fetchCount()
    const ch = supabase
      .channel('sidebar-pm-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'private_messages' }, () => fetchCount())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [currentUserId, supabase])

  const navItems: NavItem[] = [
    { href: '/dashboard',   label: t.home,       icon: <LayoutDashboard size={17} /> },
    { href: '/jobs',        label: t.jobs,        icon: <Briefcase size={17} /> },
    { href: '/chat',        label: t.chat,        icon: <MessageSquare size={17} /> },
    { href: '/inspiration', label: t.inspiration, icon: <Palette size={17} /> },
    { href: '/assets',      label: t.assets,      icon: <Library size={17} /> },
  ]

  const displayName = profile?.full_name ?? profile?.username ?? email.split('@')[0]
  const initials = displayName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

  const sidebarContent = (
    <div className="flex h-full flex-col overflow-hidden">

      {/* Logo */}
      <div className="px-4 pb-4 pt-5">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
          >
            <svg viewBox="0 0 32 32" className="h-5 w-5" fill="none">
              <path d="M7 25 L16 7 L25 25" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10 19.5 L22 19.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--tx)' }}>{t.appName}</p>
            <p className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--purple-light)' }}>
              <Sparkles size={9} />
              {t.appSub}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-4 mb-3 h-px" style={{ background: 'var(--bd)' }} />

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-3">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          const isChat = item.href === '/chat'
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
              {isChat && unreadCount > 0 && (
                <span className="relative ms-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white" style={{ color: 'white !important' }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
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
            <span className="relative">{t.admin}</span>
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
            <p className="truncate text-[11px]" style={{ color: 'var(--tx3)' }}>{profile?.specialization ?? t.designer}</p>
          </div>
        </Link>
        <LogoutButton />
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
          <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
            <svg viewBox="0 0 32 32" className="h-4 w-4" fill="none">
              <path d="M7 25 L16 7 L25 25" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-sm font-bold" style={{ color: 'var(--tx)' }}>{t.appName}</span>
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
            {!open && unreadCount > 0 && (
              <span className="absolute -end-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold" style={{ color: 'white' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
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

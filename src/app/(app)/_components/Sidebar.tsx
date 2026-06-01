'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Briefcase, MessageSquare, Library, Menu, X, Sparkles, Moon, Sun, ShieldCheck, Palette } from 'lucide-react'
import { useState } from 'react'
import LogoutButton from './LogoutButton'
import { useTheme } from '@/components/ThemeProvider'
import type { Profile } from '@/types'

type NavItem = { href: string; label: string; icon: React.ReactNode }

const navItems: NavItem[] = [
  { href: '/dashboard',   label: 'דשבורד',        icon: <LayoutDashboard size={17} /> },
  { href: '/jobs',        label: 'לוח עבודות',     icon: <Briefcase size={17} /> },
  { href: '/chat',        label: "צ'אטים",         icon: <MessageSquare size={17} /> },
  { href: '/inspiration', label: 'ספריית השראה',   icon: <Palette size={17} /> },
  { href: '/assets',      label: 'נכסים',          icon: <Library size={17} /> },
]

type Props = { profile: Profile | null; email: string }

export default function Sidebar({ profile, email }: Props) {
  const pathname   = usePathname()
  const [open, setOpen] = useState(false)
  const { theme, toggle } = useTheme()

  const displayName = profile?.full_name ?? profile?.username ?? email.split('@')[0]
  const initials = displayName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

  const sidebarContent = (
    <div className="flex h-full flex-col overflow-hidden">

      {/* Logo */}
      <div className="px-4 pb-4 pt-5">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}
          >
            <svg viewBox="0 0 32 32" className="h-5 w-5" fill="none">
              <path d="M7 25 L16 7 L25 25" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10 19.5 L22 19.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-white">גרפיקס קהילה</p>
            <p className="flex items-center gap-1 text-[10px] text-purple-400">
              <Sparkles size={9} />
              פלטפורמה לגרפיקאים
            </p>
          </div>
        </div>
      </div>

      <div className="mx-4 mb-3 h-px" style={{ background: 'var(--bd)' }} />

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-3">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${active ? 'text-white' : 'text-slate-400 hover:text-slate-100'}`}
              style={active ? {
                background: 'linear-gradient(135deg, rgba(124,58,237,.2), rgba(236,72,153,.1))',
                border: '1px solid rgba(124,58,237,.3)',
              } : {}}
            >
              {!active && (
                <span className="absolute inset-0 rounded-xl transition-all duration-200 group-hover:bg-white/[0.04]" />
              )}
              {active && (
                <span className="absolute end-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-s-full bg-purple-400" />
              )}
              <span className={`relative transition-colors duration-200 ${active ? 'text-purple-400' : 'text-slate-500 group-hover:text-slate-300'}`}>
                {item.icon}
              </span>
              <span className="relative">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Admin link — only for admins */}
      {profile?.role === 'admin' && (
        <div className="mx-3 mb-1 mt-1">
          <Link
            href="/admin"
            onClick={() => setOpen(false)}
            className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
              pathname.startsWith('/admin') ? 'text-white' : 'text-slate-400 hover:text-slate-100'
            }`}
            style={pathname.startsWith('/admin') ? {
              background: 'linear-gradient(135deg, rgba(236,72,153,.2), rgba(236,72,153,.08))',
              border: '1px solid rgba(236,72,153,.3)',
            } : {}}
          >
            {!pathname.startsWith('/admin') && (
              <span className="absolute inset-0 rounded-xl transition-all duration-200 group-hover:bg-white/[0.04]" />
            )}
            {pathname.startsWith('/admin') && (
              <span className="absolute end-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-s-full bg-pink-400" />
            )}
            <span className={`relative transition-colors duration-200 ${pathname.startsWith('/admin') ? 'text-pink-400' : 'text-slate-500 group-hover:text-slate-300'}`}>
              <ShieldCheck size={17} />
            </span>
            <span className="relative">פאנל ניהול</span>
          </Link>
        </div>
      )}

      {/* Theme toggle */}
      <div className="mx-3 mb-3 mt-1">
        <button
          onClick={toggle}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200"
          style={{ border: '1px solid var(--bd)', background: 'var(--inp)', color: 'var(--tx2)' }}
        >
          {theme === 'dark' ? (
            <Sun size={15} className="shrink-0 text-amber-400" />
          ) : (
            <Moon size={15} className="shrink-0 text-indigo-500" />
          )}
          <span>{theme === 'dark' ? 'מצב בהיר' : 'מצב כהה'}</span>
          {/* Pill — uses inline translateX so it works correctly in RTL */}
          <span
            className="relative me-auto h-5 w-9 shrink-0 rounded-full transition-colors duration-300"
            style={{ background: theme === 'dark' ? 'rgba(100,116,139,.25)' : '#7c3aed' }}
          >
            <span
              className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-300"
              style={{
                insetInlineStart: '2px',
                transform: theme === 'dark' ? 'translateX(0)' : 'translateX(-16px)',
              }}
            />
          </span>
        </button>
      </div>

      <div className="mx-4 mb-2 h-px" style={{ background: 'var(--bd)' }} />

      {/* User section — links to profile */}
      <div className="p-3">
        <Link
          href="/profile"
          onClick={() => setOpen(false)}
          className="mb-1 flex items-center gap-3 rounded-xl p-2.5 transition-all hover:bg-white/[0.04]"
        >
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-lg"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={displayName} className="h-9 w-9 rounded-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-200">{displayName}</p>
            <p className="truncate text-[11px] text-slate-500">{profile?.specialization ?? 'גרפיקאי'}</p>
          </div>
        </Link>
        <LogoutButton />
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop */}
      <aside className="hidden h-screen w-60 shrink-0 flex-col lg:flex" style={{ background: 'var(--s1)', borderLeft: '1px solid var(--bd)' }}>
        {sidebarContent}
      </aside>

      {/* Mobile top bar */}
      <div
        className="fixed inset-x-0 top-0 z-40 flex items-center justify-between px-4 py-3 lg:hidden"
        style={{ background: 'var(--hdr)', borderBottom: '1px solid var(--bd)', backdropFilter: 'blur(20px)' }}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}>
            <svg viewBox="0 0 32 32" className="h-4 w-4" fill="none">
              <path d="M7 25 L16 7 L25 25" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-sm font-bold text-white">גרפיקס</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            className="rounded-lg p-1.5 transition-all duration-200"
            style={{ color: 'var(--tx2)' }}
          >
            {theme === 'dark' ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-indigo-500" />}
          </button>
          <button onClick={() => setOpen((o) => !o)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-200">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />
          <aside className="fixed inset-y-0 end-0 z-50 w-64 lg:hidden" style={{ background: 'var(--s1)', borderLeft: '1px solid var(--bd)' }}>
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  )
}

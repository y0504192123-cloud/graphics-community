'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, Star, X, ChevronDown } from 'lucide-react'
import type { UserBadge, Profile } from '@/types'

const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-purple-400 focus:ring-2 focus:ring-purple-100'
const labelCls = 'mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-500'

export type UserStats = {
  forumPosts: number
  forumReplies: number
  inspPosts: number
  chatMsgs: number
}

interface Props {
  badges: UserBadge[]
  activeUsers: Profile[]
  userBadgesMap: Record<string, UserBadge[]>
  userStatsMap: Record<string, UserStats>
  designerOfWeek: { userId: string; name: string } | null
  createBadge: (name: string, description: string, color: string, icon: string) => Promise<{ error?: string }>
  deleteBadge: (id: string) => Promise<void>
  assignBadge: (userId: string, badgeId: string) => Promise<{ error?: string }>
  revokeBadge: (userId: string, badgeId: string) => Promise<void>
  assignBadgeToAll: (badgeId: string) => Promise<{ error?: string; count?: number }>
  setDesignerOfWeek: (userId: string) => Promise<void>
  clearDesignerOfWeek: () => Promise<void>
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtLastSeen(iso: string | null) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 2) return 'עכשיו'
  if (mins < 60) return `לפני ${mins} דק׳`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `לפני ${hrs} שע׳`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `לפני ${days} ימים`
  return fmtDate(iso)
}

function Avatar({ profile }: { profile: Profile }) {
  const name = profile.full_name ?? profile.username ?? '?'
  const initials = name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-bold"
      style={{ background: profile.avatar_color ?? 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white' }}
    >
      {profile.avatar_url
        ? <img src={profile.avatar_url} alt={name} className="h-9 w-9 rounded-full object-cover" />
        : <span style={{ color: 'white' }}>{initials}</span>
      }
    </div>
  )
}

function AddBadgeDropdown({
  userId, badges, existingBadgeIds, onAssign, isPending,
}: {
  userId: string
  badges: UserBadge[]
  existingBadgeIds: Set<string>
  onAssign: (userId: string, badgeId: string) => void
  isPending: boolean
}) {
  const [open, setOpen] = useState(false)
  const available = badges.filter(b => !existingBadgeIds.has(b.id))
  if (!available.length) return null
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={isPending}
        className="flex h-6 w-6 items-center justify-center rounded-full border transition hover:opacity-80 disabled:opacity-40"
        style={{ background: 'rgba(124,58,237,.08)', border: '1px dashed rgba(124,58,237,.4)', color: '#7c3aed' }}
        title="הוסף תג"
      >
        <Plus size={11} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute start-0 top-8 z-20 min-w-[160px] overflow-hidden rounded-xl shadow-xl"
            style={{ background: 'var(--s1)', border: '1px solid var(--bd)' }}>
            {available.map(b => (
              <button
                key={b.id}
                onClick={() => { onAssign(userId, b.id); setOpen(false) }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold transition hover:opacity-80"
                style={{ color: b.color }}
              >
                <span>{b.icon}</span>
                <span>{b.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function BadgesTab({
  badges, activeUsers, userBadgesMap, userStatsMap, designerOfWeek,
  createBadge, deleteBadge, assignBadge, revokeBadge, assignBadgeToAll,
  setDesignerOfWeek, clearDesignerOfWeek,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [weekUser, setWeekUser] = useState(designerOfWeek?.userId ?? '')
  const [showCreateBadge, setShowCreateBadge] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newColor, setNewColor] = useState('#6b21a8')
  const [newIcon, setNewIcon] = useState('⭐')
  const [createErr, setCreateErr] = useState<string | null>(null)

  const filteredUsers = activeUsers.filter(u => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (u.full_name ?? '').toLowerCase().includes(q) || (u.username ?? '').toLowerCase().includes(q)
  })

  function handleAssign(userId: string, badgeId: string) {
    startTransition(async () => { await assignBadge(userId, badgeId) })
  }

  function handleRevoke(userId: string, badgeId: string) {
    startTransition(() => revokeBadge(userId, badgeId))
  }

  function handleCreate() {
    if (!newName.trim()) { setCreateErr('שם התג חסר'); return }
    setCreateErr(null)
    startTransition(async () => {
      const res = await createBadge(newName.trim(), newDesc.trim(), newColor, newIcon.trim() || '⭐')
      if (res.error) { setCreateErr(res.error); return }
      setNewName(''); setNewDesc(''); setNewColor('#6b21a8'); setNewIcon('⭐'); setShowCreateBadge(false)
    })
  }

  return (
    <div className="space-y-6 p-4">

      {/* ── Designer of Week ── */}
      <section className="rounded-2xl p-5" style={{ background: 'var(--s1)', border: '1px solid var(--bd)' }}>
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold" style={{ color: 'var(--tx)' }}>
          <Star size={15} className="text-amber-500" /> גרפיקאי השבוע
        </h3>
        {designerOfWeek && (
          <div className="mb-3 flex items-center gap-2 rounded-xl p-3" style={{ background: 'rgba(251,191,36,.08)', border: '1px solid rgba(251,191,36,.3)' }}>
            <span className="text-lg">🏆</span>
            <span className="text-sm font-semibold" style={{ color: 'var(--tx)' }}>{designerOfWeek.name}</span>
            <button onClick={() => startTransition(() => clearDesignerOfWeek())} className="ms-auto text-xs hover:opacity-70" style={{ color: 'var(--tx3)' }}>הסר</button>
          </div>
        )}
        <div className="flex gap-2">
          <select value={weekUser} onChange={e => setWeekUser(e.target.value)} className={inputCls + ' flex-1'}>
            <option value="">בחר גרפיקאי...</option>
            {activeUsers.map(u => <option key={u.id} value={u.id}>{u.full_name ?? u.username ?? u.email}</option>)}
          </select>
          <button onClick={() => { if (weekUser) startTransition(() => setDesignerOfWeek(weekUser)) }}
            disabled={!weekUser || isPending}
            className="rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
            שמור
          </button>
        </div>
      </section>

      {/* ── Badge definitions ── */}
      <section className="rounded-2xl p-5" style={{ background: 'var(--s1)', border: '1px solid var(--bd)' }}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold" style={{ color: 'var(--tx)' }}>הגדרות תגים ({badges.length})</h3>
          <button onClick={() => setShowCreateBadge(v => !v)}
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
            <Plus size={12} /> תג חדש
          </button>
        </div>

        {showCreateBadge && (
          <div className="mb-4 rounded-xl p-4 space-y-3" style={{ background: 'var(--bg)', border: '1px solid var(--bd)' }}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>שם</label>
                <input value={newName} onChange={e => setNewName(e.target.value)} className={inputCls} placeholder="שם התג" />
              </div>
              <div>
                <label className={labelCls}>אימוג׳י</label>
                <input value={newIcon} onChange={e => setNewIcon(e.target.value)} className={inputCls} placeholder="⭐" />
              </div>
              <div>
                <label className={labelCls}>צבע</label>
                <div className="flex gap-2">
                  <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)}
                    className="h-[42px] w-12 cursor-pointer rounded-xl border border-slate-200 p-1" />
                  <input value={newColor} onChange={e => setNewColor(e.target.value)} className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>תיאור</label>
                <input value={newDesc} onChange={e => setNewDesc(e.target.value)} className={inputCls} placeholder="תיאור קצר" />
              </div>
            </div>
            {createErr && <p className="text-xs text-red-500">{createErr}</p>}
            <div className="flex gap-2">
              <button onClick={handleCreate} disabled={isPending}
                className="rounded-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>צור</button>
              <button onClick={() => setShowCreateBadge(false)} className="rounded-xl px-4 py-2 text-sm" style={{ color: 'var(--tx3)', border: '1px solid var(--bd)' }}>ביטול</button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {badges.map(b => (
            <div key={b.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5"
              style={{ background: 'var(--bg)', border: '1px solid var(--bd)' }}>
              <span className="text-lg">{b.icon}</span>
              <div className="min-w-0 flex-1">
                <span className="text-sm font-semibold" style={{ color: b.color }}>{b.name}</span>
                {b.description && <span className="ms-2 text-xs" style={{ color: 'var(--tx3)' }}>{b.description}</span>}
              </div>
              {b.is_auto && (
                <button onClick={() => startTransition(async () => {
                  const r = await assignBadgeToAll(b.id)
                  if (r.count !== undefined) alert(`✅ הוקצה ל-${r.count} משתמשים`)
                })} disabled={isPending}
                  className="rounded-full px-2 py-0.5 text-[10px] transition hover:opacity-70"
                  style={{ background: 'rgba(16,185,129,.1)', color: '#059669', border: '1px solid rgba(16,185,129,.25)' }}>
                  הקצה לכולם
                </button>
              )}
              <button onClick={() => startTransition(() => deleteBadge(b.id))} className="text-slate-300 hover:text-red-400 transition">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── Users table ── */}
      <section className="rounded-2xl overflow-hidden" style={{ background: 'var(--s1)', border: '1px solid var(--bd)' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--bd)' }}>
          <h3 className="text-sm font-bold" style={{ color: 'var(--tx)' }}>משתמשים פעילים ({activeUsers.length})</h3>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="חיפוש לפי שם..."
            className="rounded-xl px-3 py-1.5 text-xs outline-none"
            style={{ background: 'var(--inp)', border: '1px solid var(--bd)', color: 'var(--tx)', width: '180px' }}
          />
        </div>

        <div className="divide-y" style={{ borderColor: 'var(--bd)' }}>
          {filteredUsers.map(u => {
            const stats = userStatsMap[u.id] ?? { forumPosts: 0, forumReplies: 0, inspPosts: 0, chatMsgs: 0 }
            const myBadges = userBadgesMap[u.id] ?? []
            const myBadgeIds = new Set(myBadges.map(b => b.id))

            return (
              <div key={u.id} className="flex flex-wrap items-start gap-4 px-5 py-4 transition hover:bg-slate-50/50">

                {/* Avatar + name */}
                <div className="flex items-center gap-3" style={{ minWidth: '180px' }}>
                  <Avatar profile={u} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--tx)' }}>
                      {u.full_name ?? u.username ?? '—'}
                    </p>
                    {u.username && u.full_name && (
                      <p className="text-[11px] truncate" style={{ color: 'var(--tx3)' }}>@{u.username}</p>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]" style={{ color: 'var(--tx3)' }}>
                  <span title="תאריך הצטרפות">📅 {fmtDate(u.created_at)}</span>
                  <span title="כניסה אחרונה">🕐 {fmtLastSeen(u.last_seen)}</span>
                  <span title="פוסטים בפורום">💬 {stats.forumPosts + stats.forumReplies} פורום</span>
                  <span title="עבודות השראה">🎨 {stats.inspPosts} עבודות</span>
                  <span title="הודעות צ׳אט">✉️ {stats.chatMsgs} הודעות</span>
                </div>

                {/* Badges + controls */}
                <div className="flex flex-wrap items-center gap-1.5 ms-auto">
                  {myBadges.map(b => (
                    <span key={b.id}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold"
                      style={{ background: `${b.color}15`, color: b.color, border: `1px solid ${b.color}30` }}>
                      <span>{b.icon}</span>
                      <span>{b.name}</span>
                      <button onClick={() => handleRevoke(u.id, b.id)} disabled={isPending}
                        className="ms-0.5 opacity-50 hover:opacity-100 transition hover:text-red-400">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                  <AddBadgeDropdown
                    userId={u.id}
                    badges={badges}
                    existingBadgeIds={myBadgeIds}
                    onAssign={handleAssign}
                    isPending={isPending}
                  />
                </div>

              </div>
            )
          })}
          {filteredUsers.length === 0 && (
            <p className="px-5 py-8 text-center text-sm" style={{ color: 'var(--tx3)' }}>לא נמצאו משתמשים</p>
          )}
        </div>
      </section>

    </div>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, Award, Star } from 'lucide-react'
import type { UserBadge, Profile } from '@/types'

const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-purple-400 focus:ring-2 focus:ring-purple-100'
const labelCls = 'mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-500'

interface Props {
  badges: UserBadge[]
  activeUsers: Profile[]
  userBadgesMap: Record<string, UserBadge[]>
  designerOfWeek: { userId: string; name: string } | null
  createBadge: (name: string, description: string, color: string, icon: string) => Promise<{ error?: string }>
  deleteBadge: (id: string) => Promise<void>
  assignBadge: (userId: string, badgeId: string) => Promise<{ error?: string }>
  revokeBadge: (userId: string, badgeId: string) => Promise<void>
  assignBadgeToAll: (badgeId: string) => Promise<{ error?: string; count?: number }>
  setDesignerOfWeek: (userId: string) => Promise<void>
  clearDesignerOfWeek: () => Promise<void>
}

export default function BadgesTab({
  badges, activeUsers, userBadgesMap, designerOfWeek,
  createBadge, deleteBadge, assignBadge, revokeBadge, assignBadgeToAll,
  setDesignerOfWeek, clearDesignerOfWeek,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newColor, setNewColor] = useState('#6b21a8')
  const [newIcon, setNewIcon] = useState('⭐')
  const [err, setErr] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedBadge, setSelectedBadge] = useState('')
  const [assignErr, setAssignErr] = useState<string | null>(null)
  const [weekUser, setWeekUser] = useState(designerOfWeek?.userId ?? '')

  function handleCreate() {
    if (!newName.trim()) { setErr('שם התג חסר'); return }
    setErr(null)
    startTransition(async () => {
      const res = await createBadge(newName.trim(), newDesc.trim(), newColor, newIcon.trim() || '⭐')
      if (res.error) { setErr(res.error); return }
      setNewName(''); setNewDesc(''); setNewColor('#6b21a8'); setNewIcon('⭐')
    })
  }

  function handleAssign() {
    if (!selectedUser || !selectedBadge) { setAssignErr('בחר משתמש ותג'); return }
    setAssignErr(null)
    startTransition(async () => {
      const res = await assignBadge(selectedUser, selectedBadge)
      if (res.error) { setAssignErr(res.error); return }
      setSelectedUser(''); setSelectedBadge('')
    })
  }

  return (
    <div className="space-y-8 p-4">

      {/* Designer of the Week */}
      <section className="rounded-2xl p-5" style={{ background: 'var(--s1)', border: '1px solid var(--bd)' }}>
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold" style={{ color: 'var(--tx)' }}>
          <Star size={15} className="text-amber-500" /> גרפיקאי השבוע
        </h3>
        {designerOfWeek && (
          <div className="mb-3 flex items-center gap-2 rounded-xl p-3" style={{ background: 'rgba(251,191,36,.1)', border: '1px solid rgba(251,191,36,.3)' }}>
            <span className="text-lg">🏆</span>
            <span className="text-sm font-semibold" style={{ color: 'var(--tx)' }}>{designerOfWeek.name}</span>
            <button onClick={() => startTransition(() => clearDesignerOfWeek())}
              className="ms-auto text-xs hover:opacity-70" style={{ color: 'var(--tx3)' }}>הסר</button>
          </div>
        )}
        <div className="flex gap-2">
          <select
            value={weekUser}
            onChange={e => setWeekUser(e.target.value)}
            className={inputCls + ' flex-1'}
          >
            <option value="">בחר גרפיקאי...</option>
            {activeUsers.map(u => (
              <option key={u.id} value={u.id}>{u.full_name ?? u.username ?? u.email}</option>
            ))}
          </select>
          <button
            onClick={() => { if (weekUser) startTransition(() => setDesignerOfWeek(weekUser)) }}
            disabled={!weekUser || isPending}
            className="rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}
          >
            שמור
          </button>
        </div>
      </section>

      {/* Assign badge to user */}
      <section className="rounded-2xl p-5" style={{ background: 'var(--s1)', border: '1px solid var(--bd)' }}>
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold" style={{ color: 'var(--tx)' }}>
          <Award size={15} className="text-purple-500" /> הענק תג למשתמש
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelCls}>משתמש</label>
            <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} className={inputCls}>
              <option value="">בחר משתמש...</option>
              {activeUsers.map(u => (
                <option key={u.id} value={u.id}>{u.full_name ?? u.username ?? u.email}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>תג</label>
            <select value={selectedBadge} onChange={e => setSelectedBadge(e.target.value)} className={inputCls}>
              <option value="">בחר תג...</option>
              {badges.map(b => (
                <option key={b.id} value={b.id}>{b.icon} {b.name}</option>
              ))}
            </select>
          </div>
        </div>
        {assignErr && <p className="mt-2 text-xs text-red-500">{assignErr}</p>}
        <button onClick={handleAssign} disabled={isPending}
          className="mt-3 rounded-xl px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
          הענק תג
        </button>
      </section>

      {/* Current user badges */}
      {selectedUser && userBadgesMap[selectedUser] && (
        <section className="rounded-2xl p-5" style={{ background: 'var(--s1)', border: '1px solid var(--bd)' }}>
          <h3 className="mb-3 text-sm font-bold" style={{ color: 'var(--tx)' }}>
            תגים של {activeUsers.find(u => u.id === selectedUser)?.full_name ?? ''}
          </h3>
          <div className="flex flex-wrap gap-2">
            {userBadgesMap[selectedUser].map(b => (
              <div key={b.id} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                style={{ background: `${b.color}18`, color: b.color, border: `1px solid ${b.color}30` }}>
                <span>{b.icon}</span><span>{b.name}</span>
                <button onClick={() => startTransition(() => revokeBadge(selectedUser, b.id))}
                  className="ms-1 opacity-50 hover:opacity-100 text-red-400">✕</button>
              </div>
            ))}
            {userBadgesMap[selectedUser].length === 0 && (
              <p className="text-xs" style={{ color: 'var(--tx3)' }}>אין תגים</p>
            )}
          </div>
        </section>
      )}

      {/* Create new badge */}
      <section className="rounded-2xl p-5" style={{ background: 'var(--s1)', border: '1px solid var(--bd)' }}>
        <h3 className="mb-4 text-sm font-bold" style={{ color: 'var(--tx)' }}>צור תג חדש</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelCls}>שם</label>
            <input value={newName} onChange={e => setNewName(e.target.value)} className={inputCls} placeholder="שם התג" />
          </div>
          <div>
            <label className={labelCls}>אייקון (אמוג'י)</label>
            <input value={newIcon} onChange={e => setNewIcon(e.target.value)} className={inputCls} placeholder="⭐" />
          </div>
          <div>
            <label className={labelCls}>צבע</label>
            <div className="flex gap-2">
              <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)}
                className="h-[42px] w-14 cursor-pointer rounded-xl border border-slate-200 p-1" />
              <input value={newColor} onChange={e => setNewColor(e.target.value)} className={inputCls} placeholder="#6b21a8" />
            </div>
          </div>
          <div>
            <label className={labelCls}>תיאור</label>
            <input value={newDesc} onChange={e => setNewDesc(e.target.value)} className={inputCls} placeholder="תיאור קצר" />
          </div>
        </div>
        {err && <p className="mt-2 text-xs text-red-500">{err}</p>}
        <button onClick={handleCreate} disabled={isPending}
          className="mt-3 flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
          <Plus size={14} /> צור תג
        </button>
      </section>

      {/* All badges */}
      <section className="rounded-2xl p-5" style={{ background: 'var(--s1)', border: '1px solid var(--bd)' }}>
        <h3 className="mb-4 text-sm font-bold" style={{ color: 'var(--tx)' }}>כל התגים ({badges.length})</h3>
        <div className="space-y-2">
          {badges.map(b => (
            <div key={b.id} className="flex items-center gap-3 rounded-xl px-4 py-3"
              style={{ background: 'var(--bg)', border: '1px solid var(--bd)' }}>
              <span className="text-xl">{b.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: b.color }}>{b.name}</p>
                {b.description && <p className="text-xs" style={{ color: 'var(--tx3)' }}>{b.description}</p>}
              </div>
              {b.is_auto && (
                <button
                  onClick={() => startTransition(async () => {
                    const r = await assignBadgeToAll(b.id)
                    if (r.count !== undefined) alert(`הוקצה ל-${r.count} משתמשים`)
                  })}
                  disabled={isPending}
                  className="text-[10px] rounded-full px-2 py-0.5 transition hover:opacity-70"
                  style={{ background: 'rgba(16,185,129,.1)', color: '#059669', border: '1px solid rgba(16,185,129,.2)' }}
                  title="הקצה לכל המשתמשים הפעילים"
                >
                  הקצה לכולם
                </button>
              )}
              <button onClick={() => startTransition(() => deleteBadge(b.id))}
                className="text-slate-400 hover:text-red-500 transition">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}

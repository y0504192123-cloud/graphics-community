'use client'

import { useState, useTransition } from 'react'
import { Edit2, Save, X, Plus, Trash2, Camera, Star, MapPin } from 'lucide-react'
import type { Profile, PortfolioItem, Specialization } from '@/types'

type Props = {
  profile: Profile
  portfolioItems: PortfolioItem[]
  allSpecializations: Specialization[]
  selectedSpecializationIds: string[]
  updateProfile: (formData: FormData) => Promise<void>
  addPortfolioItem: (formData: FormData) => Promise<void>
  deletePortfolioItem: (id: string) => Promise<void>
}

const itemGradients = [
  'from-violet-500/50 via-purple-700/30 to-indigo-900',
  'from-pink-500/50 via-rose-700/30 to-purple-900',
  'from-blue-500/50 via-indigo-700/30 to-violet-900',
  'from-emerald-500/50 via-teal-700/30 to-cyan-900',
  'from-amber-500/50 via-orange-700/30 to-red-900',
  'from-cyan-500/50 via-sky-700/30 to-blue-900',
]

const inputCls = 'w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-slate-100 outline-none transition-all focus:border-purple-500/50 focus:bg-white/[0.06] focus:ring-2 focus:ring-purple-500/20 placeholder:text-slate-600'
const labelCls = 'mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-500'

export default function ProfileClient({ profile, portfolioItems, allSpecializations, selectedSpecializationIds, updateProfile, addPortfolioItem, deletePortfolioItem }: Props) {
  const [editing, setEditing] = useState(false)
  const [showAddItem, setShowAddItem] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [selectedIds, setSelectedIds] = useState<string[]>(selectedSpecializationIds)

  const selectedSpecs = allSpecializations.filter((s) => selectedIds.includes(s.id))

  function toggleSpec(id: string) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  const displayName = profile.full_name ?? profile.username ?? 'ללא שם'
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="min-h-full" style={{ background: 'var(--bg)' }}>

      {/* Cover banner */}
      <div
        className="relative h-52 overflow-hidden"
        style={{ background: 'var(--cover)' }}
      >
        {/* Orbs */}
        <div className="pointer-events-none absolute -start-20 top-0 h-60 w-60 rounded-full opacity-40" style={{ background: 'radial-gradient(circle, rgba(124,58,237,.5) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div className="pointer-events-none absolute end-0 bottom-0 h-48 w-48 rounded-full opacity-30" style={{ background: 'radial-gradient(circle, rgba(236,72,153,.4) 0%, transparent 70%)', filter: 'blur(35px)' }} />
        {/* Grid */}
        <div className="grid-pattern absolute inset-0 opacity-50" />

        {/* Edit cover hint */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity hover:opacity-100">
          <button className="flex items-center gap-2 rounded-xl bg-black/50 px-4 py-2 text-xs text-white backdrop-blur-sm">
            <Camera size={13} />
            שנה כיסוי
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6">

        {/* Profile header (overlaps cover) */}
        <div className="-mt-16 mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            {/* Avatar */}
            <div className="relative">
              <div
                className="flex h-28 w-28 shrink-0 items-center justify-center rounded-3xl text-3xl font-bold text-white shadow-2xl"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)', boxShadow: '0 0 0 4px #0a0a0f, 0 0 0 6px rgba(124,58,237,.3)' }}
              >
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={displayName} className="h-28 w-28 rounded-3xl object-cover" />
                ) : (
                  initials
                )}
              </div>
              {/* Online indicator */}
              <span
                className="absolute bottom-1 end-1 h-4 w-4 rounded-full border-2 border-[#0a0a0f] bg-emerald-400"
                style={{ boxShadow: '0 0 8px rgba(52,211,153,.6)' }}
              />
            </div>

            {/* Name + meta */}
            {!editing && (
              <div className="mb-1">
                <h1 className="text-2xl font-bold text-white">{displayName}</h1>
                {profile.username && (
                  <p className="text-sm text-slate-500" dir="ltr">@{profile.username}</p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {selectedSpecs.map((spec) => (
                    <span
                      key={spec.id}
                      className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-purple-300"
                      style={{ background: 'rgba(124,58,237,.15)', border: '1px solid rgba(124,58,237,.3)' }}
                    >
                      <Star size={10} />
                      {spec.name}
                    </span>
                  ))}
                  <span
                    className="flex items-center gap-1 rounded-full px-3 py-1 text-xs text-slate-500"
                    style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)' }}
                  >
                    <MapPin size={10} />
                    ישראל
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Edit button */}
          <button
            onClick={() => setEditing((e) => !e)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 hover:scale-[1.02] ${
              editing
                ? 'bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]'
                : 'text-white'
            }`}
            style={!editing ? { background: 'linear-gradient(135deg, rgba(124,58,237,.3), rgba(124,58,237,.15))', border: '1px solid rgba(124,58,237,.4)' } : { border: '1px solid rgba(255,255,255,.1)' }}
          >
            {editing ? <X size={14} /> : <Edit2 size={14} />}
            {editing ? 'ביטול' : 'ערוך פרופיל'}
          </button>
        </div>

        {/* Bio (view mode) */}
        {!editing && profile.bio && (
          <p className="mb-8 max-w-2xl text-sm leading-relaxed text-slate-400">{profile.bio}</p>
        )}

        {/* Edit form */}
        {editing && (
          <form
            className="mb-8 animate-fade-up rounded-2xl p-6"
            style={{ background: 'var(--inp)', border: '1px solid var(--bd)' }}
            action={(formData) => {
              startTransition(async () => {
                await updateProfile(formData)
                setEditing(false)
              })
            }}
          >
            <h3 className="mb-5 text-sm font-bold uppercase tracking-widest text-slate-400">עריכת פרופיל</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>שם מלא</label>
                <input name="full_name" defaultValue={profile.full_name ?? ''} placeholder="ישראל ישראלי" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>שם משתמש</label>
                <input name="username" defaultValue={profile.username ?? ''} placeholder="israel123" className={inputCls} dir="ltr" />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>תחומי התמחות</label>
                {selectedIds.map((id) => (
                  <input key={id} type="hidden" name="specialization_ids" value={id} />
                ))}
                <div className="flex flex-wrap gap-2 pt-1">
                  {allSpecializations.map((spec) => {
                    const active = selectedIds.includes(spec.id)
                    return (
                      <button
                        key={spec.id}
                        type="button"
                        onClick={() => toggleSpec(spec.id)}
                        className="rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-150"
                        style={active
                          ? { background: 'rgba(124,58,237,.25)', border: '1px solid rgba(124,58,237,.6)', color: '#c4b5fd' }
                          : { background: 'var(--inp)', border: '1px solid var(--bd)', color: 'var(--tx2)' }
                        }
                      >
                        {active && <Star size={9} className="me-1 inline-block" />}
                        {spec.name}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>אודות</label>
                <textarea name="bio" defaultValue={profile.bio ?? ''} rows={3} placeholder="ספר על עצמך — ניסיון, סגנון, מה אתה אוהב לעצב..." className={`${inputCls} resize-none`} />
              </div>
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="mt-5 flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
            >
              <Save size={14} />
              {isPending ? 'שומר...' : 'שמור שינויים'}
            </button>
          </form>
        )}

        {/* Portfolio section */}
        <div className="pb-10">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">העבודות שלי</h2>
              <p className="mt-0.5 text-xs text-slate-600">{portfolioItems.length} עבודות</p>
            </div>
            <button
              onClick={() => setShowAddItem((s) => !s)}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:opacity-90 hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)', boxShadow: '0 4px 20px rgba(124,58,237,.35)' }}
            >
              <Plus size={15} />
              הוסף עבודה
            </button>
          </div>

          {/* Add item form */}
          {showAddItem && (
            <form
              className="mb-6 animate-fade-up rounded-2xl p-6"
              style={{ background: 'rgba(124,58,237,.05)', border: '1px solid rgba(124,58,237,.2)' }}
              action={(formData) => {
                startTransition(async () => {
                  await addPortfolioItem(formData)
                  setShowAddItem(false)
                })
              }}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold text-purple-300">עבודה חדשה</h3>
                <button type="button" onClick={() => setShowAddItem(false)} className="text-slate-500 hover:text-slate-300">
                  <X size={16} />
                </button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>כותרת</label>
                  <input name="title" required placeholder="שם הפרויקט" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>קישור לתמונה</label>
                  <input name="image_url" type="url" placeholder="https://..." className={inputCls} dir="ltr" />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>תיאור</label>
                  <textarea name="description" rows={2} placeholder="תאר את הפרויקט..." className={`${inputCls} resize-none`} />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl px-5 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
                >
                  {isPending ? 'מוסיף...' : 'הוסף לעבודות שלי'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddItem(false)}
                  className="rounded-xl border border-white/[0.08] px-4 py-2 text-sm text-slate-400 hover:text-slate-200"
                >
                  ביטול
                </button>
              </div>
            </form>
          )}

          {/* Portfolio grid */}
          {portfolioItems.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center gap-5 rounded-3xl py-20 text-center"
              style={{ border: '2px dashed rgba(124,58,237,.15)', background: 'rgba(124,58,237,.03)' }}
            >
              <div
                className="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
                style={{ background: 'rgba(124,58,237,.12)', border: '1px solid rgba(124,58,237,.2)' }}
              >
                🎨
              </div>
              <div>
                <p className="font-semibold text-slate-300">אין עבודות עדיין</p>
                <p className="mt-1 text-sm text-slate-600">הוסף את העבודות הראשונות שלך ותתחיל לבנות נוכחות</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {portfolioItems.map((item, i) => (
                <div
                  key={item.id}
                  className="group relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5"
                  style={{ border: '1px solid var(--bd)', boxShadow: '0 4px 20px rgba(0,0,0,.15)' }}
                >
                  {/* Image / gradient placeholder */}
                  <div className="aspect-[4/3] w-full overflow-hidden">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className={`h-full w-full bg-gradient-to-br ${itemGradients[i % itemGradients.length]} flex items-center justify-center`}>
                        <div className="text-center opacity-50">
                          <div className="text-4xl">🖼️</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div
                    className="p-4"
                    style={{ background: 'var(--card)', borderTop: '1px solid var(--bd)' }}
                  >
                    <p className="font-semibold text-slate-100">{item.title}</p>
                    {item.description && (
                      <p className="mt-1 text-xs leading-relaxed text-slate-500 line-clamp-2">{item.description}</p>
                    )}
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={() => startTransition(async () => { await deletePortfolioItem(item.id) })}
                    className="absolute end-2 top-2 flex h-8 w-8 items-center justify-center rounded-xl bg-red-950/90 text-red-400 opacity-0 backdrop-blur-sm transition-all duration-200 hover:bg-red-900 group-hover:opacity-100"
                  >
                    <Trash2 size={13} />
                  </button>

                  {/* Hover overlay */}
                  <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: 'linear-gradient(to top, rgba(124,58,237,.08) 0%, transparent 50%)' }} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

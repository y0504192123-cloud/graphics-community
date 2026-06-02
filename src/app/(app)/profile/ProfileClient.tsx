'use client'

import { useState, useTransition } from 'react'
import { Edit2, Save, X, Plus, Trash2, Star, MapPin, User, FileText, Tag } from 'lucide-react'
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

const inputCls = [
  'w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all',
  'bg-white placeholder:text-slate-400',
  'border-slate-200 hover:border-slate-300',
  'focus:border-purple-400 focus:ring-2 focus:ring-purple-100',
].join(' ')

const labelCls = 'mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500'

const itemPlaceholders = [
  'from-violet-100 via-purple-200 to-indigo-200',
  'from-pink-100 via-rose-200 to-purple-200',
  'from-blue-100 via-indigo-200 to-violet-200',
  'from-emerald-100 via-teal-200 to-cyan-200',
  'from-amber-100 via-orange-200 to-red-100',
  'from-cyan-100 via-sky-200 to-blue-200',
]

function FieldGroup({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{icon}{label}</label>
      {children}
    </div>
  )
}

export default function ProfileClient({
  profile, portfolioItems, allSpecializations, selectedSpecializationIds,
  updateProfile, addPortfolioItem, deletePortfolioItem,
}: Props) {
  const [editing, setEditing]       = useState(false)
  const [showAddItem, setShowAddItem] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [selectedIds, setSelectedIds] = useState<string[]>(selectedSpecializationIds)

  const selectedSpecs = allSpecializations.filter((s) => selectedIds.includes(s.id))

  function toggleSpec(id: string) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  const displayName = profile.full_name ?? profile.username ?? 'ללא שם'
  const initials = displayName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="min-h-full" style={{ background: 'var(--bg)' }}>

      {/* ── Cover ── */}
      <div
        className="relative h-48 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #6b21a8 0%, #7c3aed 40%, #a855f7 70%, #6366f1 100%)' }}
      >
        <div className="grid-pattern absolute inset-0 opacity-20" />
        <div className="pointer-events-none absolute -start-10 -top-10 h-56 w-56 rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,.4) 0%, transparent 70%)', filter: 'blur(30px)' }} />
        <div className="pointer-events-none absolute bottom-0 end-0 h-40 w-40 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,.5) 0%, transparent 70%)', filter: 'blur(25px)' }} />
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6">

        {/* ── Profile header ── */}
        <div className="-mt-14 mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-5">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div
                className="flex h-28 w-28 items-center justify-center rounded-full text-2xl font-bold shadow-xl"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                  border: '4px solid #ffffff',
                  color: 'white',
                  boxShadow: '0 8px 32px rgba(107,33,168,.25)',
                }}
              >
                {profile.avatar_url
                  ? <img src={profile.avatar_url} alt={displayName} className="h-full w-full rounded-full object-cover" />
                  : <span style={{ color: 'white' }}>{initials}</span>
                }
              </div>
              <span
                className="absolute bottom-1 end-1 h-4 w-4 rounded-full bg-emerald-400"
                style={{ border: '2px solid white', boxShadow: '0 0 0 1px rgba(52,211,153,.3)' }}
              />
            </div>

            {/* Name */}
            {!editing && (
              <div className="pb-1">
                <h1 className="text-2xl font-bold" style={{ color: 'var(--tx)' }}>{displayName}</h1>
                {profile.username && (
                  <p className="text-sm" style={{ color: 'var(--tx3)' }} dir="ltr">@{profile.username}</p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {selectedSpecs.map((spec) => (
                    <span
                      key={spec.id}
                      className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                      style={{ background: 'rgba(124,58,237,.1)', color: '#7c3aed', border: '1px solid rgba(124,58,237,.2)' }}
                    >
                      <Star size={9} />
                      {spec.name}
                    </span>
                  ))}
                  <span
                    className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs"
                    style={{ background: 'var(--s2)', color: 'var(--tx3)', border: '1px solid var(--bd)' }}
                  >
                    <MapPin size={9} />
                    ישראל
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Edit toggle */}
          <button
            onClick={() => setEditing((e) => !e)}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 hover:scale-[1.02]"
            style={editing
              ? { background: 'var(--s2)', border: '1px solid var(--bd)', color: 'var(--tx2)' }
              : { background: 'linear-gradient(135deg, #7c3aed, #6b21a8)', color: 'white', boxShadow: '0 4px 16px rgba(107,33,168,.3)' }
            }
          >
            {editing ? <X size={14} /> : <Edit2 size={14} />}
            <span style={{ color: editing ? 'var(--tx2)' : 'white' }}>
              {editing ? 'ביטול' : 'ערוך פרופיל'}
            </span>
          </button>
        </div>

        {/* Bio (view) */}
        {!editing && profile.bio && (
          <p className="mb-6 max-w-2xl rounded-2xl px-5 py-4 text-sm leading-relaxed"
            style={{ background: 'var(--s1)', border: '1px solid var(--bd)', color: 'var(--tx2)', boxShadow: '0 1px 4px rgba(0,0,0,.04)' }}>
            {profile.bio}
          </p>
        )}

        {/* ── Edit form ── */}
        {editing && (
          <div
            className="mb-8 animate-fade-up rounded-2xl p-6"
            style={{ background: 'var(--s1)', border: '1px solid var(--bd)', boxShadow: '0 4px 24px rgba(0,0,0,.06)' }}
          >
            <h3 className="mb-6 text-base font-bold" style={{ color: 'var(--tx)' }}>ערוך פרופיל</h3>

            <form
              action={(formData) => {
                startTransition(async () => {
                  await updateProfile(formData)
                  setEditing(false)
                })
              }}
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <FieldGroup label="שם מלא" icon={<User size={11} />}>
                  <input
                    name="full_name"
                    defaultValue={profile.full_name ?? ''}
                    className={inputCls}
                    style={{ color: 'var(--tx)' }}
                    placeholder="השם שלך"
                  />
                </FieldGroup>

                <FieldGroup label="שם משתמש" icon={<User size={11} />}>
                  <input
                    name="username"
                    defaultValue={profile.username ?? ''}
                    className={inputCls}
                    style={{ color: 'var(--tx)' }}
                    dir="ltr"
                    placeholder="username"
                  />
                </FieldGroup>

                <div className="sm:col-span-2">
                  <FieldGroup label="תחומי התמחות" icon={<Tag size={11} />}>
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
                              ? { background: 'rgba(124,58,237,.12)', border: '1.5px solid rgba(124,58,237,.4)', color: '#7c3aed' }
                              : { background: 'white', border: '1px solid #e2e8f0', color: 'var(--tx3)' }
                            }
                          >
                            {active && <Star size={9} className="me-1 inline-block" />}
                            {spec.name}
                          </button>
                        )
                      })}
                    </div>
                  </FieldGroup>
                </div>

                <div className="sm:col-span-2">
                  <FieldGroup label="אודות" icon={<FileText size={11} />}>
                    <textarea
                      name="bio"
                      defaultValue={profile.bio ?? ''}
                      rows={4}
                      className={`${inputCls} resize-none`}
                      style={{ color: 'var(--tx)' }}
                      placeholder="ספר על עצמך..."
                    />
                  </FieldGroup>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold transition-all hover:opacity-90 disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, #7c3aed, #6b21a8)',
                    color: 'white',
                    boxShadow: '0 4px 16px rgba(107,33,168,.35)',
                  }}
                >
                  <Save size={14} style={{ color: 'white' }} />
                  <span style={{ color: 'white' }}>{isPending ? 'שומר...' : 'שמור שינויים'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-xl px-4 py-2.5 text-sm font-medium transition hover:bg-slate-100"
                  style={{ border: '1px solid var(--bd)', color: 'var(--tx2)' }}
                >
                  ביטול
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Portfolio ── */}
        <div className="pb-10">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--tx)' }}>העבודות שלי</h2>
              <p className="mt-0.5 text-xs" style={{ color: 'var(--tx3)' }}>{portfolioItems.length} עבודות בפורטפוליו</p>
            </div>
            <button
              onClick={() => setShowAddItem((s) => !s)}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all hover:opacity-90 hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #6b21a8)', color: 'white', boxShadow: '0 4px 16px rgba(107,33,168,.3)' }}
            >
              <Plus size={15} style={{ color: 'white' }} />
              <span style={{ color: 'white' }}>הוסף עבודה</span>
            </button>
          </div>

          {/* Add portfolio form */}
          {showAddItem && (
            <div
              className="mb-6 animate-fade-up rounded-2xl p-6"
              style={{ background: 'var(--s1)', border: '1px solid var(--bd)', boxShadow: '0 4px 24px rgba(0,0,0,.06)' }}
            >
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-sm font-bold" style={{ color: 'var(--tx)' }}>הוספת עבודה חדשה</h3>
                <button
                  type="button"
                  onClick={() => setShowAddItem(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-slate-100"
                  style={{ color: 'var(--tx3)' }}
                >
                  <X size={15} />
                </button>
              </div>
              <form
                action={(formData) => {
                  startTransition(async () => {
                    await addPortfolioItem(formData)
                    setShowAddItem(false)
                  })
                }}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldGroup label="כותרת" icon={<FileText size={11} />}>
                    <input name="title" required className={inputCls} style={{ color: 'var(--tx)' }} placeholder="שם הפרויקט" />
                  </FieldGroup>
                  <FieldGroup label="קישור לתמונה" icon={<FileText size={11} />}>
                    <input name="image_url" type="url" className={inputCls} style={{ color: 'var(--tx)' }} dir="ltr" placeholder="https://..." />
                  </FieldGroup>
                  <div className="sm:col-span-2">
                    <FieldGroup label="תיאור" icon={<FileText size={11} />}>
                      <textarea name="description" rows={3} className={`${inputCls} resize-none`} style={{ color: 'var(--tx)' }} placeholder="תאר את הפרויקט..." />
                    </FieldGroup>
                  </div>
                </div>
                <div className="mt-5 flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition hover:opacity-90 disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #6b21a8)', color: 'white', boxShadow: '0 4px 16px rgba(107,33,168,.3)' }}
                  >
                    <span style={{ color: 'white' }}>{isPending ? 'מוסיף...' : 'הוסף לפורטפוליו'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddItem(false)}
                    className="rounded-xl px-4 py-2.5 text-sm font-medium transition hover:bg-slate-100"
                    style={{ border: '1px solid var(--bd)', color: 'var(--tx2)' }}
                  >
                    ביטול
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Empty state */}
          {portfolioItems.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center gap-5 rounded-3xl py-20 text-center"
              style={{ border: '2px dashed var(--bd)', background: 'white' }}
            >
              <div
                className="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
                style={{ background: 'rgba(124,58,237,.08)', border: '1px solid rgba(124,58,237,.15)' }}
              >
                🎨
              </div>
              <div>
                <p className="font-semibold" style={{ color: 'var(--tx2)' }}>אין עבודות עדיין</p>
                <p className="mt-1 text-sm" style={{ color: 'var(--tx3)' }}>הוסף את העבודות הראשונות שלך ותתחיל לבנות נוכחות</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {portfolioItems.map((item, i) => (
                <div
                  key={item.id}
                  className="group relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1"
                  style={{ background: 'white', border: '1px solid var(--bd)', boxShadow: '0 2px 8px rgba(0,0,0,.06), 0 8px 24px rgba(107,33,168,.04)' }}
                >
                  <div className="aspect-[4/3] w-full overflow-hidden">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className={`h-full w-full bg-gradient-to-br ${itemPlaceholders[i % itemPlaceholders.length]} flex items-center justify-center`}>
                        <span className="text-4xl opacity-40">🖼️</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4" style={{ borderTop: '1px solid var(--bd)' }}>
                    <p className="font-semibold" style={{ color: 'var(--tx)' }}>{item.title}</p>
                    {item.description && (
                      <p className="mt-1 text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--tx3)' }}>{item.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => startTransition(async () => { await deletePortfolioItem(item.id) })}
                    className="absolute end-2 top-2 flex h-8 w-8 items-center justify-center rounded-xl opacity-0 backdrop-blur-sm transition-all duration-200 group-hover:opacity-100 hover:scale-110"
                    style={{ background: 'rgba(255,255,255,.9)', color: '#ef4444', border: '1px solid rgba(239,68,68,.2)', boxShadow: '0 2px 8px rgba(0,0,0,.1)' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

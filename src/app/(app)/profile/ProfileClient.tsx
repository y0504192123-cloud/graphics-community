'use client'

import { useState, useTransition, useRef } from 'react'
import { Edit2, Save, X, Plus, Trash2, Star, MapPin, User, FileText, Tag, Camera } from 'lucide-react'
import type { Profile, PortfolioItem, Specialization } from '@/types'

type Props = {
  profile: Profile
  portfolioItems: PortfolioItem[]
  allSpecializations: Specialization[]
  selectedSpecializationIds: string[]
  updateProfile: (formData: FormData) => Promise<void>
  addPortfolioItem: (formData: FormData) => Promise<void>
  deletePortfolioItem: (id: string) => Promise<void>
  getAvatarUploadUrl: () => Promise<{ signedUrl?: string; publicUrl?: string; error?: string }>
  updateAvatarUrl: (url: string) => Promise<void>
  deleteAvatar: () => Promise<void>
  updateAvatarColor: (color: string) => Promise<void>
  getPortfolioItemUploadUrl: () => Promise<{ signedUrl?: string; publicUrl?: string; error?: string }>
}

async function compressImage(file: File, maxMB = 3.5): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const MAX_DIM = 2500
      let { width, height } = img
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width >= height) { height = Math.round(height * MAX_DIM / width); width = MAX_DIM }
        else                 { width = Math.round(width * MAX_DIM / height); height = MAX_DIM }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      const maxBytes = maxMB * 1024 * 1024
      const qualities = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4]
      const tryQuality = (i: number) => {
        canvas.toBlob((blob) => {
          if (!blob) { reject(new Error('toBlob failed')); return }
          if (blob.size <= maxBytes || i >= qualities.length - 1) {
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg', lastModified: Date.now() }))
          } else { tryQuality(i + 1) }
        }, 'image/jpeg', qualities[i] ?? 0.35)
      }
      tryQuality(0)
    }
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Image load failed')) }
    img.src = objectUrl
  })
}

const AVATAR_COLORS = [
  '#7c3aed', // סגול
  '#6366f1', // אינדיגו
  '#3b82f6', // כחול
  '#0ea5e9', // שמיים
  '#06b6d4', // ציאן
  '#10b981', // ירוק
  '#f59e0b', // ענבר
  '#ef4444', // אדום
  '#ec4899', // ורוד
  '#64748b', // אפור
]

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
  getAvatarUploadUrl, updateAvatarUrl, deleteAvatar, updateAvatarColor,
  getPortfolioItemUploadUrl,
}: Props) {
  const [editing, setEditing]               = useState(false)
  const [isPending, startTransition]         = useTransition()
  const [selectedIds, setSelectedIds]        = useState<string[]>(selectedSpecializationIds)
  const [avatarUrl, setAvatarUrl]            = useState<string | null>(profile.avatar_url)
  const [avatarColor, setAvatarColor]        = useState<string>(profile.avatar_color ?? '#7c3aed')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError]        = useState<string | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const [portfolioFile, setPortfolioFile]       = useState<File | null>(null)
  const [portfolioPreview, setPortfolioPreview] = useState<string | null>(null)
  const [portfolioUploading, setPortfolioUploading] = useState(false)
  const [portfolioError, setPortfolioError]     = useState<string | null>(null)
  const portfolioFileRef = useRef<HTMLInputElement>(null)

  const selectedSpecs = allSpecializations.filter((s) => selectedIds.includes(s.id))

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    setAvatarError(null)
    const urlResult = await getAvatarUploadUrl()
    if (urlResult.error || !urlResult.signedUrl) {
      setAvatarError(urlResult.error ?? 'שגיאה בהכנת ה-URL')
      setAvatarUploading(false)
      return
    }
    const res = await fetch(urlResult.signedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type || 'image/jpeg' },
      body: file,
    })
    if (!res.ok) {
      setAvatarError('שגיאה בהעלאת התמונה')
      setAvatarUploading(false)
      return
    }
    await updateAvatarUrl(urlResult.publicUrl!)
    setAvatarUrl(urlResult.publicUrl!)
    setAvatarUploading(false)
  }

  async function handleDeleteAvatar() {
    setAvatarUploading(true)
    setAvatarError(null)
    await deleteAvatar()
    setAvatarUrl(null)
    setAvatarUploading(false)
  }

  function handleColorChange(color: string) {
    setAvatarColor(color)
    startTransition(async () => { await updateAvatarColor(color) })
  }

  function handlePortfolioFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPortfolioFile(file)
    setPortfolioError(null)
    const reader = new FileReader()
    reader.onload = (ev) => setPortfolioPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  async function handlePortfolioFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!portfolioFile) return
    setPortfolioUploading(true)
    setPortfolioError(null)

    let compressed = portfolioFile
    try { compressed = await compressImage(portfolioFile) } catch {}

    const urlResult = await getPortfolioItemUploadUrl()
    if (urlResult.error || !urlResult.signedUrl) {
      setPortfolioError(urlResult.error ?? 'שגיאה בהכנת ה-URL')
      setPortfolioUploading(false)
      return
    }

    const res = await fetch(urlResult.signedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
      body: compressed,
    })
    if (!res.ok) {
      setPortfolioError('שגיאה בהעלאת התמונה')
      setPortfolioUploading(false)
      return
    }

    const fd = new FormData(e.currentTarget)
    fd.set('image_url', urlResult.publicUrl!)

    startTransition(async () => {
      await addPortfolioItem(fd)
      setPortfolioFile(null)
      setPortfolioPreview(null)
      setPortfolioUploading(false)
    })
  }

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
            <div className="group/av shrink-0">
              {/* Wrapper scopes absolute children to the avatar circle only */}
              <div className="relative inline-flex">
                {/* Circle button — upload on click */}
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="group relative flex h-28 w-28 items-center justify-center rounded-full text-2xl font-bold overflow-hidden"
                  style={{
                    background: avatarColor,
                    border: '4px solid #ffffff',
                    boxShadow: `0 8px 32px ${avatarColor}55`,
                    color: 'white',
                  }}
                  title="לחץ לשינוי תמונת פרופיל"
                >
                  {avatarUploading ? (
                    <div className="h-7 w-7 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                  ) : (
                    <span style={{ color: 'white' }}>{initials}</span>
                  )}
                  <span className="absolute inset-0 flex items-center justify-center rounded-full opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                    style={{ background: 'rgba(0,0,0,.45)' }}>
                    <Camera size={22} style={{ color: 'white' }} />
                  </span>
                </button>

                {/* Delete X — visible on avatar area hover, only when image exists */}
                {avatarUrl && !avatarUploading && (
                  <button
                    type="button"
                    onClick={handleDeleteAvatar}
                    className="absolute -top-1 -end-1 z-10 flex h-6 w-6 items-center justify-center rounded-full opacity-0 transition-opacity duration-200 group-hover/av:opacity-100"
                    style={{ background: '#ef4444', border: '2px solid white', color: 'white' }}
                    title="מחק תמונת פרופיל"
                  >
                    <X size={11} />
                  </button>
                )}

                {/* Online dot — positioned on the avatar circle, not the swatches */}
                {!avatarUploading && (
                  <span
                    className="absolute bottom-1 end-1 h-4 w-4 rounded-full bg-emerald-400"
                    style={{ border: '2px solid white', boxShadow: '0 0 0 1px rgba(52,211,153,.3)' }}
                  />
                )}
              </div>

              {/* Color picker swatches — outside the relative wrapper */}
              <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                {AVATAR_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleColorChange(color)}
                    className="h-5 w-5 rounded-full transition-all duration-150 hover:scale-110"
                    style={{
                      background: color,
                      boxShadow: avatarColor === color
                        ? `0 0 0 2px white, 0 0 0 4px ${color}`
                        : 'none',
                    }}
                    title={color}
                  />
                ))}
              </div>

              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
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

        {/* Avatar error */}
        {avatarError && (
          <div className="mb-4 rounded-xl px-4 py-2.5 text-sm text-red-600" style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)' }}>
            {avatarError}
          </div>
        )}

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
              <p className="mt-0.5 text-xs" style={{ color: 'var(--tx3)' }}>{portfolioItems.length} עבודות</p>
            </div>
            <button
              onClick={() => portfolioFileRef.current?.click()}
              disabled={portfolioUploading}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-white transition-all hover:opacity-90 hover:scale-[1.05] disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #6b21a8)', boxShadow: '0 4px 16px rgba(107,33,168,.3)' }}
              title="הוסף עבודה"
            >
              <Plus size={18} style={{ color: 'white' }} />
            </button>
            <input ref={portfolioFileRef} type="file" accept="image/*" className="hidden" onChange={handlePortfolioFileChange} />
          </div>

          {/* Upload form — appears after file is selected */}
          {portfolioFile && (
            <div
              className="mb-6 animate-fade-up rounded-2xl p-5"
              style={{ background: 'var(--s1)', border: '1px solid var(--bd)', boxShadow: '0 4px 24px rgba(0,0,0,.06)' }}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold" style={{ color: 'var(--tx)' }}>העלאת עבודה</h3>
                <button
                  type="button"
                  onClick={() => { setPortfolioFile(null); setPortfolioPreview(null); setPortfolioError(null) }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-slate-100"
                  style={{ color: 'var(--tx3)' }}
                >
                  <X size={15} />
                </button>
              </div>
              {portfolioPreview && (
                <div className="mb-4 overflow-hidden rounded-xl" style={{ maxHeight: 200 }}>
                  <img src={portfolioPreview} alt="תצוגה מקדימה" className="w-full object-cover" style={{ maxHeight: 200 }} />
                </div>
              )}
              {portfolioError && (
                <p className="mb-3 rounded-lg px-3 py-2 text-xs text-red-500" style={{ background: 'rgba(239,68,68,.08)' }}>{portfolioError}</p>
              )}
              <form onSubmit={handlePortfolioFormSubmit}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}><FileText size={11} />כותרת (אופציונלי)</label>
                    <input name="title" className={inputCls} style={{ color: 'var(--tx)' }} placeholder="שם הפרויקט" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}><FileText size={11} />תיאור (אופציונלי)</label>
                    <textarea name="description" rows={2} className={`${inputCls} resize-none`} style={{ color: 'var(--tx)' }} placeholder="תאר את הפרויקט..." />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={portfolioUploading || isPending}
                    className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition hover:opacity-90 disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #6b21a8)', color: 'white', boxShadow: '0 4px 16px rgba(107,33,168,.3)' }}
                  >
                    <span style={{ color: 'white' }}>{portfolioUploading || isPending ? 'מעלה...' : 'העלה'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPortfolioFile(null); setPortfolioPreview(null); setPortfolioError(null) }}
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

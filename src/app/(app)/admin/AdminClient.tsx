'use client'

import { useState, useTransition, useActionState, useRef } from 'react'
import {
  ShieldCheck, Users, Clock, CheckCircle2, XCircle, Newspaper,
  Hash, Plus, Trash2, ExternalLink, Phone, MapPin, Briefcase, Star, X, Palette, FolderOpen, ImageIcon, MessagesSquare, ScanText
} from 'lucide-react'
import type { Profile, NewsItem, ChatCategory, Specialization, InspirationCategory, JobCategory, AssetCategory, ForumCategory, Font, FontWeight } from '@/types'
import FontsTab from './FontsTab'

type Tab = 'pending' | 'users' | 'news' | 'categories' | 'specializations' | 'insp_cats' | 'job_cats' | 'asset_cats' | 'branding' | 'forum_cats' | 'fonts'

type Props = {
  pendingUsers:    Profile[]
  activeUsers:     Profile[]
  newsItems:       NewsItem[]
  categories:      ChatCategory[]
  specializations: Specialization[]
  inspirationCategories:       InspirationCategory[]
  jobCategories:               JobCategory[]
  assetCategories:             AssetCategory[]
  forumCategories:             ForumCategory[]
  logoUrl:                     string | null
  approveUser:     (id: string) => Promise<void>
  rejectUser:      (id: string) => Promise<void>
  makeAdmin:       (id: string) => Promise<void>
  removeAdmin:     (id: string) => Promise<void>
  publishNews:     (prev: { error?: string } | null, fd: FormData) => Promise<{ error?: string } | null>
  deleteNews:      (id: string) => Promise<void>
  addCategory:     (prev: { error?: string } | null, fd: FormData) => Promise<{ error?: string } | null>
  deleteCategory:  (id: string) => Promise<void>
  addSpecialization:           (prev: { error?: string } | null, fd: FormData) => Promise<{ error?: string } | null>
  deleteSpecialization:        (id: string) => Promise<void>
  deleteUser:                  (id: string) => Promise<void>
  addInspirationCategory:      (prev: { error?: string } | null, fd: FormData) => Promise<{ error?: string } | null>
  deleteInspirationCategory:   (id: string) => Promise<void>
  addJobCategory:              (prev: { error?: string } | null, fd: FormData) => Promise<{ error?: string } | null>
  deleteJobCategory:           (id: string) => Promise<void>
  addAssetCategory:            (prev: { error?: string } | null, fd: FormData) => Promise<{ error?: string } | null>
  deleteAssetCategory:         (id: string) => Promise<void>
  addForumCategory:            (prev: { error?: string } | null, fd: FormData) => Promise<{ error?: string } | null>
  deleteForumCategory:         (id: string) => Promise<void>
  getLogoUploadUrl:            () => Promise<{ signedUrl?: string; publicUrl?: string; error?: string }>
  saveLogoUrl:                 (url: string) => Promise<void>
  fonts:                       Font[]
  fontWeights:                 FontWeight[]
  saveFont:                    (prev: { error?: string } | null, fd: FormData) => Promise<{ error?: string } | null>
  deleteFont:                  (id: string) => Promise<void>
  getFontPreviewUploadUrl:     () => Promise<{ signedUrl?: string; publicUrl?: string; error?: string }>
  getFontFileUploadUrl:        (fileName: string) => Promise<{ signedUrl?: string; path?: string; error?: string }>
  generateFontPreview:         (fontId: string, filePath: string) => Promise<{ error?: string; previewUrl?: string }>
  createFontWithPreview:       (filePath: string, fontName: string) => Promise<{ fontId?: string; fontName?: string; previewUrl?: string; error?: string }>
  updateFontsCompany:          (fontIds: string[], company: string, downloadUrl: string) => Promise<{ error?: string }>
  quickUpdateFont:             (id: string, updates: { name?: string; company?: string; download_url?: string; is_free?: boolean }) => Promise<{ error?: string }>
  recomputeHashBatch:          (offset: number, limit: number) => Promise<{ done: number; errors: number; total: number; batchSize: number }>
  rebuildPreviewsBatch:        (offset: number, limit: number) => Promise<{ done: number; errors: number; total: number; batchSize: number }>
  computeEmbeddingBatch:       (offset: number, limit: number) => Promise<{ done: number; errors: number; total: number; batchSize: number }>
  buildLetterEmbeddingsBatch:  (offset: number, limit: number, nameFilter?: string) => Promise<{ done: number; errors: number; total: number; batchSize: number }>
}

const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-purple-400 focus:ring-2 focus:ring-purple-100'
const labelCls = 'mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-500'

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'pending',         label: 'ממתינים לאישור',   icon: <Clock size={15} /> },
  { id: 'users',           label: 'משתמשים פעילים',    icon: <Users size={15} /> },
  { id: 'news',            label: 'חדשות',              icon: <Newspaper size={15} /> },
  { id: 'categories',      label: "קטגוריות צ'אט",     icon: <Hash size={15} /> },
  { id: 'specializations', label: 'תחומי התמחות',      icon: <Star size={15} /> },
  { id: 'insp_cats',       label: 'קטגוריות השראה',    icon: <Palette size={15} /> },
  { id: 'job_cats',        label: 'קטגוריות עבודות',   icon: <FolderOpen size={15} /> },
  { id: 'asset_cats',      label: 'קטגוריות חומרים',   icon: <FolderOpen size={15} /> },
  { id: 'forum_cats',      label: 'קטגוריות פורום',     icon: <MessagesSquare size={15} /> },
  { id: 'fonts',           label: 'מאגר פונטים',        icon: <ScanText size={15} /> },
  { id: 'branding',        label: 'מיתוג',              icon: <ImageIcon size={15} /> },
]

export default function AdminClient({
  pendingUsers, activeUsers, newsItems, categories, specializations,
  inspirationCategories, jobCategories, assetCategories, forumCategories,
  logoUrl: initialLogoUrl,
  approveUser, rejectUser, makeAdmin, removeAdmin,
  publishNews, deleteNews, addCategory, deleteCategory,
  addSpecialization, deleteSpecialization, deleteUser,
  addInspirationCategory, deleteInspirationCategory,
  addJobCategory, deleteJobCategory,
  addAssetCategory, deleteAssetCategory,
  addForumCategory, deleteForumCategory,
  getLogoUploadUrl, saveLogoUrl,
  fonts, fontWeights, saveFont, deleteFont,
  getFontPreviewUploadUrl, getFontFileUploadUrl, generateFontPreview,
  createFontWithPreview, updateFontsCompany, quickUpdateFont,
  recomputeHashBatch, rebuildPreviewsBatch, computeEmbeddingBatch, buildLetterEmbeddingsBatch,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('pending')
  const [isPending, startTransition] = useTransition()
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(initialLogoUrl)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoError, setLogoError] = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const [newsState,      newsAction,      newsPending]     = useActionState(publishNews, null)
  const [catState,       catAction,       catPending]      = useActionState(addCategory, null)
  const [specState,      specAction,      specPending]     = useActionState(addSpecialization, null)
  const [inspCatState,   inspCatAction,   inspCatPending]  = useActionState(addInspirationCategory, null)
  const [jobCatState,    jobCatAction,    jobCatPending]   = useActionState(addJobCategory, null)
  const [assetCatState,  assetCatAction,  assetCatPending] = useActionState(addAssetCategory, null)
  const [forumCatState,  forumCatAction,  forumCatPending] = useActionState(addForumCategory, null)
  const [showNewsForm, setShowNewsForm] = useState(false)

  return (
    <div className="min-h-full" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <div
        className="relative overflow-hidden px-6 py-8"
        style={{ background: 'var(--hero)' }}
      >
        <div className="pointer-events-none absolute -top-20 start-0 h-60 w-60 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, rgba(236,72,153,.6) 0%, transparent 70%)', filter: 'blur(50px)' }} />
        <div className="grid-pattern absolute inset-0 opacity-40" />
        <div className="relative mx-auto max-w-5xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'linear-gradient(135deg, #ec4899, #be185d)' }}>
              <ShieldCheck size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">פאנל ניהול</h1>
              <p className="text-xs text-slate-400">
                {pendingUsers.length} ממתינים · {activeUsers.length} פעילים · {categories.length} קטגוריות
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-6">

        {/* Tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200"
              style={activeTab === tab.id
                ? { background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: 'white', boxShadow: '0 4px 16px rgba(124,58,237,.4)' }
                : { background: 'var(--inp)', border: '1px solid var(--bd)', color: 'var(--tx2)' }
              }
            >
              {tab.icon}
              {tab.label}
              {tab.id === 'pending' && pendingUsers.length > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {pendingUsers.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Pending Users ── */}
        {activeTab === 'pending' && (
          <div className="space-y-4">
            {pendingUsers.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl py-16 text-center" style={{ border: '2px dashed var(--bd)', background: 'var(--inp)' }}>
                <CheckCircle2 size={32} className="text-emerald-500" />
                <p className="font-semibold" style={{ color: 'var(--tx2)' }}>אין בקשות ממתינות</p>
                <p className="text-sm text-slate-600">כל הבקשות טופלו</p>
              </div>
            ) : (
              pendingUsers.map((user) => (
                <div
                  key={user.id}
                  className="animate-fade-up overflow-hidden rounded-2xl"
                  style={{ background: 'var(--s2)', border: '1px solid var(--bd)' }}
                >
                  <div className="flex items-center justify-between gap-3 border-b px-5 py-3.5" style={{ borderColor: 'var(--bd)' }}>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}>
                        {(user.full_name ?? user.email ?? 'א')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold" style={{ color: 'var(--tx)' }}>{user.full_name ?? '—'}</p>
                        <p className="text-xs ltr" style={{ color: 'var(--tx3)' }} dir="ltr">{user.email ?? '—'}</p>
                      </div>
                    </div>
                    <span className="rounded-full px-2.5 py-0.5 text-xs font-bold text-amber-700" style={{ background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.25)' }}>
                      ממתין
                    </span>
                  </div>

                  <div className="grid gap-3 px-5 py-4 sm:grid-cols-2 lg:grid-cols-3">
                    {user.city && (
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <MapPin size={13} className="text-slate-500 shrink-0" />
                        {user.city}
                      </div>
                    )}
                    {user.specialization && (
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Star size={13} className="text-purple-400 shrink-0" />
                        {user.specialization}
                      </div>
                    )}
                    {user.years_experience != null && (
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Briefcase size={13} className="text-slate-500 shrink-0" />
                        {user.years_experience} שנות ניסיון
                      </div>
                    )}
                    {user.phone && (
                      <div className="flex items-center gap-2 text-sm text-slate-400" dir="ltr">
                        <Phone size={13} className="text-slate-500 shrink-0" />
                        {user.phone}
                      </div>
                    )}
                    {user.portfolio_url && (
                      <div className="sm:col-span-2 lg:col-span-3">
                        <a
                          href={user.portfolio_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                          dir="ltr"
                        >
                          <ExternalLink size={12} />
                          {user.portfolio_url}
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 border-t px-5 py-3" style={{ borderColor: 'var(--bd)' }}>
                    <button
                      disabled={isPending}
                      onClick={() => startTransition(async () => { await approveUser(user.id) })}
                      className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
                    >
                      <CheckCircle2 size={14} />
                      אשר
                    </button>
                    <button
                      disabled={isPending}
                      onClick={() => startTransition(async () => { await rejectUser(user.id) })}
                      className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold text-red-400 transition-all hover:bg-red-500/10 disabled:opacity-50"
                      style={{ borderColor: 'rgba(239,68,68,.3)' }}
                    >
                      <XCircle size={14} />
                      דחה
                    </button>
                    <button
                      disabled={isPending}
                      onClick={() => { if (confirm(`למחוק את ${user.full_name ?? user.email}?`)) startTransition(async () => { await deleteUser(user.id) }) }}
                      className="me-auto flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold text-slate-500 transition-all hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                      style={{ borderColor: 'var(--bd)' }}
                    >
                      <Trash2 size={14} />
                      מחק
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Active Users ── */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {activeUsers.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl py-16 text-center" style={{ border: '2px dashed var(--bd)', background: 'var(--inp)' }}>
                <Users size={32} className="text-slate-600" />
                <p className="text-sm text-slate-500">אין משתמשים פעילים עדיין</p>
              </div>
            ) : (
              activeUsers.map((user) => (
                <div
                  key={user.id}
                  className="animate-fade-up overflow-hidden rounded-2xl"
                  style={{ background: 'var(--s2)', border: '1px solid var(--bd)' }}
                >
                  <div className="flex items-center justify-between gap-3 border-b px-5 py-3.5" style={{ borderColor: 'var(--bd)' }}>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}>
                        {(user.full_name ?? user.email ?? 'א')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold" style={{ color: 'var(--tx)' }}>{user.full_name ?? '—'}</p>
                        <p className="text-xs ltr" style={{ color: 'var(--tx3)' }} dir="ltr">{user.email ?? '—'}</p>
                      </div>
                    </div>
                    {user.role === 'admin' && (
                      <span className="rounded-full px-2.5 py-0.5 text-xs font-bold text-pink-700" style={{ background: 'rgba(236,72,153,.1)', border: '1px solid rgba(236,72,153,.25)' }}>מנהל</span>
                    )}
                  </div>

                  <div className="grid gap-3 px-5 py-4 sm:grid-cols-2 lg:grid-cols-3">
                    {user.city && (
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <MapPin size={13} className="text-slate-500 shrink-0" />
                        {user.city}
                      </div>
                    )}
                    {user.years_experience != null && (
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Briefcase size={13} className="text-slate-500 shrink-0" />
                        {user.years_experience} שנות ניסיון
                      </div>
                    )}
                    {user.phone && (
                      <div className="flex items-center gap-2 text-sm text-slate-400" dir="ltr">
                        <Phone size={13} className="text-slate-500 shrink-0" />
                        {user.phone}
                      </div>
                    )}
                    {user.portfolio_url && (
                      <div className="sm:col-span-2 lg:col-span-3">
                        <a
                          href={user.portfolio_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                          dir="ltr"
                        >
                          <ExternalLink size={12} />
                          {user.portfolio_url}
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 border-t px-5 py-3" style={{ borderColor: 'var(--bd)' }}>
                    {user.role === 'admin' ? (
                      <button
                        disabled={isPending}
                        onClick={() => startTransition(async () => { await removeAdmin(user.id) })}
                        className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold text-slate-400 transition hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 disabled:opacity-50"
                        style={{ borderColor: 'var(--bd)' }}
                      >
                        הסר הרשאת מנהל
                      </button>
                    ) : (
                      <button
                        disabled={isPending}
                        onClick={() => startTransition(async () => { await makeAdmin(user.id) })}
                        className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
                      >
                        <ShieldCheck size={14} />
                        הפוך למנהל
                      </button>
                    )}
                    <button
                      disabled={isPending}
                      onClick={() => { if (confirm(`למחוק את ${user.full_name ?? user.email}?`)) startTransition(async () => { await deleteUser(user.id) }) }}
                      className="me-auto flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold text-slate-500 transition-all hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                      style={{ borderColor: 'var(--bd)' }}
                    >
                      <Trash2 size={14} />
                      מחק
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── News ── */}
        {activeTab === 'news' && (
          <div>
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm font-bold" style={{ color: 'var(--tx2)' }}>{newsItems.length} פריטי חדשות</p>
              <button
                onClick={() => setShowNewsForm((s) => !s)}
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white transition hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
              >
                {showNewsForm ? <X size={14} /> : <Plus size={14} />}
                {showNewsForm ? 'ביטול' : 'פרסם חדשות'}
              </button>
            </div>

            {showNewsForm && (
              <form
                action={newsAction}
                className="mb-6 animate-fade-up rounded-2xl p-5"
                style={{ background: 'rgba(124,58,237,.06)', border: '1px solid rgba(124,58,237,.2)' }}
              >
                {newsState?.error && (
                  <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{newsState.error}</p>
                )}
                <div className="space-y-3">
                  <div>
                    <label className={labelCls}>כותרת</label>
                    <input name="title" required className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>תוכן</label>
                    <textarea name="content" required rows={3} className={`${inputCls} resize-none`} style={{ borderColor: 'rgba(124,58,237,.3)' }} />
                  </div>
                  <div>
                    <label className={labelCls}>קישור לתמונה (אופציונלי)</label>
                    <input name="image_url" type="url" className={inputCls} dir="ltr" />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={newsPending}
                  className="mt-4 rounded-xl px-5 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
                >
                  {newsPending ? 'מפרסם...' : 'פרסם'}
                </button>
              </form>
            )}

            <div className="space-y-3">
              {newsItems.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-2xl py-16 text-center" style={{ border: '2px dashed var(--bd)', background: 'var(--inp)' }}>
                  <Newspaper size={28} className="text-slate-600" />
                  <p className="text-sm text-slate-500">אין חדשות עדיין</p>
                </div>
              ) : (
                newsItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-4 rounded-2xl p-4"
                    style={{ background: 'var(--s2)', border: '1px solid var(--bd)' }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold line-clamp-1" style={{ color: 'var(--tx)' }}>{item.title}</p>
                      <p className="mt-0.5 text-xs line-clamp-2" style={{ color: 'var(--tx2)' }}>{item.content}</p>
                      <p className="mt-1 text-[11px]" style={{ color: 'var(--tx3)' }}>
                        {new Date(item.created_at).toLocaleDateString('he-IL')}
                      </p>
                    </div>
                    <button
                      disabled={isPending}
                      onClick={() => startTransition(async () => { await deleteNews(item.id) })}
                      className="shrink-0 rounded-lg p-1.5 text-slate-600 transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── Chat Categories ── */}
        {activeTab === 'categories' && (
          <div>
            <form action={catAction} className="mb-6">
              <label className={`${labelCls} mb-2`}>קטגוריה חדשה</label>
              <div className="flex gap-2">
                <input
                  name="name"
                  required
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all hover:border-slate-300 focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                />
                <button
                  type="submit"
                  disabled={catPending}
                  className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
                >
                  <Plus size={15} />
                  הוסף
                </button>
              </div>
            </form>
            {catState?.error && (
              <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{catState.error}</p>
            )}

            <div className="space-y-2">
              {categories.length === 0 ? (
                <div className="rounded-2xl py-12 text-center text-sm text-slate-500" style={{ border: '2px dashed var(--bd)', background: 'var(--inp)' }}>
                  אין קטגוריות עדיין
                </div>
              ) : (
                categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between rounded-xl px-4 py-3"
                    style={{ background: 'var(--s2)', border: '1px solid var(--bd)' }}
                  >
                    <div className="flex items-center gap-2.5">
                      <Hash size={13} className="text-purple-400" />
                      <span className="text-sm font-medium" style={{ color: 'var(--tx)' }}>{cat.name}</span>
                    </div>
                    <button
                      disabled={isPending}
                      onClick={() => startTransition(async () => { await deleteCategory(cat.id) })}
                      className="rounded-lg p-1.5 text-slate-600 transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── Specializations ── */}
        {activeTab === 'specializations' && (
          <div>
            <form action={specAction} className="mb-6">
              <label className={`${labelCls} mb-2`}>תחום התמחות חדש</label>
              <div className="flex gap-2">
                <input
                  name="name"
                  required
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all hover:border-slate-300 focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                />
                <button
                  type="submit"
                  disabled={specPending}
                  className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
                >
                  <Plus size={15} />
                  הוסף
                </button>
              </div>
            </form>
            {specState?.error && (
              <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{specState.error}</p>
            )}

            <div className="flex flex-wrap gap-2">
              {specializations.length === 0 ? (
                <div className="w-full rounded-2xl py-12 text-center text-sm text-slate-500" style={{ border: '2px dashed var(--bd)', background: 'var(--inp)' }}>
                  אין תחומי התמחות עדיין
                </div>
              ) : (
                specializations.map((spec) => (
                  <div
                    key={spec.id}
                    className="flex items-center gap-2 rounded-full px-3 py-1.5"
                    style={{ background: 'rgba(124,58,237,.12)', border: '1px solid rgba(124,58,237,.3)' }}
                  >
                    <Star size={11} className="text-purple-400 shrink-0" />
                    <span className="text-sm font-medium text-purple-700">{spec.name}</span>
                    <button
                      disabled={isPending}
                      onClick={() => startTransition(async () => { await deleteSpecialization(spec.id) })}
                      className="text-slate-500 transition hover:text-red-400 disabled:opacity-50"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── Inspiration Categories ── */}
        {activeTab === 'insp_cats' && (
          <div>
            <form action={inspCatAction} className="mb-6">
              <label className={`${labelCls} mb-2`}>קטגוריה חדשה לספריית השראה</label>
              <div className="flex gap-2">
                <input
                  name="name"
                  required
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all hover:border-slate-300 focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                />
                <button
                  type="submit"
                  disabled={inspCatPending}
                  className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
                >
                  <Plus size={15} />
                  הוסף
                </button>
              </div>
            </form>
            {inspCatState?.error && (
              <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{inspCatState.error}</p>
            )}

            <div className="space-y-2">
              {inspirationCategories.length === 0 ? (
                <div className="rounded-2xl py-12 text-center text-sm text-slate-500" style={{ border: '2px dashed var(--bd)', background: 'var(--inp)' }}>
                  אין קטגוריות עדיין
                </div>
              ) : (
                inspirationCategories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between rounded-xl px-4 py-3"
                    style={{ background: 'var(--s2)', border: '1px solid var(--bd)' }}
                  >
                    <div className="flex items-center gap-2.5">
                      <Palette size={13} className="text-purple-400" />
                      <span className="text-sm font-medium" style={{ color: 'var(--tx)' }}>{cat.name}</span>
                    </div>
                    <button
                      disabled={isPending}
                      onClick={() => startTransition(async () => { await deleteInspirationCategory(cat.id) })}
                      className="rounded-lg p-1.5 text-slate-600 transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── Job Categories ── */}
        {activeTab === 'job_cats' && (
          <div>
            <form action={jobCatAction} className="mb-6">
              <label className={`${labelCls} mb-2`}>קטגוריה חדשה ללוח עבודות</label>
              <div className="flex gap-2">
                <input
                  name="name"
                  required
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all hover:border-slate-300 focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                />
                <button
                  type="submit"
                  disabled={jobCatPending}
                  className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
                >
                  <Plus size={15} />
                  הוסף
                </button>
              </div>
            </form>
            {jobCatState?.error && (
              <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{jobCatState.error}</p>
            )}
            <div className="space-y-2">
              {jobCategories.length === 0 ? (
                <div className="rounded-2xl py-12 text-center text-sm text-slate-500" style={{ border: '2px dashed var(--bd)', background: 'var(--inp)' }}>
                  אין קטגוריות עדיין
                </div>
              ) : (
                jobCategories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: 'var(--s2)', border: '1px solid var(--bd)' }}>
                    <div className="flex items-center gap-2.5">
                      <FolderOpen size={13} className="text-purple-400" />
                      <span className="text-sm font-medium" style={{ color: 'var(--tx)' }}>{cat.name}</span>
                    </div>
                    <button disabled={isPending} onClick={() => startTransition(async () => { await deleteJobCategory(cat.id) })}
                      className="rounded-lg p-1.5 transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50" style={{ color: 'var(--tx3)' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── Asset Categories ── */}
        {activeTab === 'asset_cats' && (
          <div>
            <form action={assetCatAction} className="mb-6">
              <label className={`${labelCls} mb-2`}>קטגוריה חדשה לחומרים לשימוש</label>
              <div className="flex gap-2">
                <input
                  name="name"
                  required
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all hover:border-slate-300 focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                  placeholder="למשל: פונטים, אייקונים, תמונות..."
                />
                <button
                  type="submit"
                  disabled={assetCatPending}
                  className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
                >
                  <Plus size={15} />
                  הוסף
                </button>
              </div>
            </form>
            {assetCatState?.error && (
              <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{assetCatState.error}</p>
            )}
            <div className="space-y-2">
              {assetCategories.length === 0 ? (
                <div className="rounded-2xl py-12 text-center text-sm text-slate-500" style={{ border: '2px dashed var(--bd)', background: 'var(--inp)' }}>
                  אין קטגוריות עדיין
                </div>
              ) : (
                assetCategories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: 'var(--s2)', border: '1px solid var(--bd)' }}>
                    <div className="flex items-center gap-2.5">
                      <FolderOpen size={13} className="text-purple-400" />
                      <span className="text-sm font-medium" style={{ color: 'var(--tx)' }}>{cat.name}</span>
                    </div>
                    <button disabled={isPending} onClick={() => startTransition(async () => { await deleteAssetCategory(cat.id) })}
                      className="rounded-lg p-1.5 transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50" style={{ color: 'var(--tx3)' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── Forum Categories ── */}
        {activeTab === 'forum_cats' && (
          <div>
            <form action={forumCatAction} className="mb-6 space-y-3">
              <label className={`${labelCls} mb-2`}>קטגוריה חדשה לפורום</label>
              <div className="grid gap-2 sm:grid-cols-2">
                <input name="name" required className={inputCls} placeholder="שם הקטגוריה (חובה)" />
                <input name="description" className={inputCls} placeholder="תיאור קצר (אופציונלי)" />
                <input name="icon" className={inputCls} placeholder="אמוג׳י (ברירת מחדל: 💬)" />
                <input name="sort_order" type="number" className={inputCls} placeholder="סדר (0, 1, 2...)" defaultValue="0" />
              </div>
              <button
                type="submit"
                disabled={forumCatPending}
                className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
              >
                <Plus size={15} />
                הוסף קטגוריה
              </button>
              {forumCatState?.error && (
                <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{forumCatState.error}</p>
              )}
            </form>
            <div className="space-y-2">
              {forumCategories.length === 0 ? (
                <div className="rounded-2xl py-12 text-center text-sm text-slate-500" style={{ border: '2px dashed var(--bd)', background: 'var(--inp)' }}>
                  אין קטגוריות פורום עדיין
                </div>
              ) : (
                forumCategories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: 'var(--s2)', border: '1px solid var(--bd)' }}>
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{cat.icon ?? '💬'}</span>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--tx)' }}>{cat.name}</p>
                        {cat.description && <p className="text-xs" style={{ color: 'var(--tx3)' }}>{cat.description}</p>}
                      </div>
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: 'rgba(124,58,237,.1)', color: '#7c3aed' }}>
                        סדר: {cat.sort_order}
                      </span>
                    </div>
                    <button
                      disabled={isPending}
                      onClick={() => startTransition(async () => { await deleteForumCategory(cat.id) })}
                      className="rounded-lg p-1.5 transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                      style={{ color: 'var(--tx3)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── Fonts ── */}
        {activeTab === 'fonts' && (
          <FontsTab
            fonts={fonts}
            fontWeights={fontWeights}
            saveFont={saveFont}
            deleteFont={deleteFont}
            getFontPreviewUploadUrl={getFontPreviewUploadUrl}
            getFontFileUploadUrl={getFontFileUploadUrl}
            generateFontPreview={generateFontPreview}
            createFontWithPreview={createFontWithPreview}
            updateFontsCompany={updateFontsCompany}
            quickUpdateFont={quickUpdateFont}
            recomputeHashBatch={recomputeHashBatch}
            rebuildPreviewsBatch={rebuildPreviewsBatch}
            computeEmbeddingBatch={computeEmbeddingBatch}
            buildLetterEmbeddingsBatch={buildLetterEmbeddingsBatch}
          />
        )}

        {/* ── Branding ── */}
        {activeTab === 'branding' && (
          <div>
            <div className="mb-6 rounded-2xl p-6" style={{ background: 'var(--s2)', border: '1px solid var(--bd)' }}>
              <h3 className="mb-1 text-base font-bold" style={{ color: 'var(--tx)' }}>לוגו האתר</h3>
              <p className="mb-5 text-sm" style={{ color: 'var(--tx3)' }}>
                הלוגו יופיע בסרגל הניווט, בדף ההתחברות ובמייל האישור לנרשמים חדשים.
              </p>

              {currentLogoUrl && (
                <div className="mb-5 flex items-center gap-4 rounded-xl p-4" style={{ background: 'var(--inp)', border: '1px solid var(--bd)' }}>
                  <img src={currentLogoUrl} alt="לוגו נוכחי" className="h-12 max-w-[180px] object-contain" />
                  <span className="text-sm" style={{ color: 'var(--tx2)' }}>לוגו נוכחי</span>
                </div>
              )}

              {logoError && (
                <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-500">{logoError}</p>
              )}

              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  setLogoUploading(true)
                  setLogoError(null)
                  try {
                    const { signedUrl, publicUrl, error } = await getLogoUploadUrl()
                    if (error || !signedUrl || !publicUrl) {
                      setLogoError(error ?? 'שגיאה בקבלת URL להעלאה')
                      return
                    }
                    const res = await fetch(signedUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
                    if (!res.ok) { setLogoError('העלאה נכשלה'); return }
                    await saveLogoUrl(publicUrl)
                    setCurrentLogoUrl(publicUrl)
                  } catch (err) {
                    setLogoError('שגיאה בהעלאת הלוגו')
                  } finally {
                    setLogoUploading(false)
                    if (logoInputRef.current) logoInputRef.current.value = ''
                  }
                }}
              />

              <button
                onClick={() => logoInputRef.current?.click()}
                disabled={logoUploading}
                className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
              >
                <ImageIcon size={15} />
                {logoUploading ? 'מעלה...' : currentLogoUrl ? 'החלף לוגו' : 'העלה לוגו'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

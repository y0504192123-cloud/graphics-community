'use client'

import { useState, useTransition, useActionState, useRef } from 'react'
import {
  ShieldCheck, Users, Clock, CheckCircle2, XCircle, Newspaper,
  Hash, Plus, Trash2, ExternalLink, Phone, MapPin, Briefcase, Star, X, Palette, FolderOpen, ImageIcon, MessagesSquare, ScanText, Flag, FileText, Save,
} from 'lucide-react'
import type { Profile, NewsItem, NewsCategory, ChatCategory, Specialization, InspirationCategory, JobCategory, AssetCategory, ForumCategory, Font, FontWeight, ContentReport, UserBadge } from '@/types'
import FontsTab from './FontsTab'
import BadgesTab from './BadgesTab'

type Tab = 'pending' | 'users' | 'news' | 'categories' | 'specializations' | 'insp_cats' | 'job_cats' | 'asset_cats' | 'branding' | 'forum_cats' | 'fonts' | 'reports' | 'terms' | 'badges'

type Props = {
  pendingUsers:    Profile[]
  activeUsers:     Profile[]
  newsItems:            NewsItem[]
  newsCategories:       NewsCategory[]
  addNewsCategory:      (prev: { error?: string } | null, fd: FormData) => Promise<{ error?: string } | null>
  deleteNewsCategory:   (id: string) => Promise<void>
  getNewsImageUploadUrl: () => Promise<{ signedUrl?: string; publicUrl?: string; error?: string }>
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
  reports:                     ContentReport[]
  updateReportStatus:          (id: string, status: 'reviewed' | 'dismissed') => Promise<void>
  deleteReportedContent:       (reportId: string, contentType: string, contentId: string) => Promise<void>
  termsContent:                string
  privacyContent:              string
  saveTerms:                   (content: string) => Promise<{ error?: string }>
  savePrivacy:                 (content: string) => Promise<{ error?: string }>
  badges:                      UserBadge[]
  userBadgesMap:               Record<string, UserBadge[]>
  designerOfWeek:              { userId: string; name: string } | null
  createBadge:                 (name: string, description: string, color: string, icon: string) => Promise<{ error?: string }>
  deleteBadge:                 (id: string) => Promise<void>
  assignBadge:                 (userId: string, badgeId: string) => Promise<{ error?: string }>
  revokeBadge:                 (userId: string, badgeId: string) => Promise<void>
  assignBadgeToAll:            (badgeId: string) => Promise<{ error?: string; count?: number }>
  setDesignerOfWeek:           (userId: string) => Promise<void>
  clearDesignerOfWeek:         () => Promise<void>
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
  { id: 'badges',          label: 'תגים וגרפיקאי השבוע', icon: <Star size={15} /> },
  { id: 'reports',         label: 'דיווחים',             icon: <Flag size={15} /> },
  { id: 'terms',           label: 'תנאים ומדיניות',     icon: <FileText size={15} /> },
]

export default function AdminClient({
  pendingUsers, activeUsers, newsItems, newsCategories, categories, specializations,
  inspirationCategories, jobCategories, assetCategories, forumCategories,
  logoUrl: initialLogoUrl,
  approveUser, rejectUser, makeAdmin, removeAdmin,
  publishNews, deleteNews, addNewsCategory, deleteNewsCategory, getNewsImageUploadUrl,
  addCategory, deleteCategory,
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
  reports, updateReportStatus, deleteReportedContent,
  termsContent: initialTerms, privacyContent: initialPrivacy, saveTerms, savePrivacy,
  badges, userBadgesMap, designerOfWeek,
  createBadge, deleteBadge, assignBadge, revokeBadge, assignBadgeToAll, setDesignerOfWeek, clearDesignerOfWeek,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('pending')
  const [isPending, startTransition] = useTransition()
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(initialLogoUrl)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoError, setLogoError] = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const [newsState,      newsAction,      newsPending]     = useActionState(publishNews, null)
  const [newsCatState,   newsCatAction,   newsCatPending]  = useActionState(addNewsCategory, null)
  const [catState,       catAction,       catPending]      = useActionState(addCategory, null)
  const [specState,      specAction,      specPending]     = useActionState(addSpecialization, null)
  const [inspCatState,   inspCatAction,   inspCatPending]  = useActionState(addInspirationCategory, null)
  const [jobCatState,    jobCatAction,    jobCatPending]   = useActionState(addJobCategory, null)
  const [assetCatState,  assetCatAction,  assetCatPending] = useActionState(addAssetCategory, null)
  const [forumCatState,  forumCatAction,  forumCatPending] = useActionState(addForumCategory, null)
  const [showNewsForm, setShowNewsForm] = useState(false)
  const [newsImgUrl,   setNewsImgUrl]   = useState<string | null>(null)
  const [newsImgUploading, setNewsImgUploading] = useState(false)
  const newsImgRef = useRef<HTMLInputElement>(null)
  const [reportFilter, setReportFilter] = useState<'all' | 'pending' | 'reviewed' | 'dismissed'>('pending')
  const [termsText, setTermsText] = useState(initialTerms)
  const [privacyText, setPrivacyText] = useState(initialPrivacy)
  const [termsSaving, setTermsSaving] = useState(false)
  const [privacySaving, setPrivacySaving] = useState(false)
  const [termsSaved, setTermsSaved] = useState(false)
  const [privacySaved, setPrivacySaved] = useState(false)
  const [termsSaveError, setTermsSaveError] = useState<string | null>(null)
  const [privacySaveError, setPrivacySaveError] = useState<string | null>(null)

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
                    {user.agreed_at && (
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                        הסכים לתנאים: {new Date(user.agreed_at).toLocaleDateString('he-IL')}
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
          <div className="space-y-6">

            {/* Category management */}
            <div className="rounded-2xl p-4" style={{ background: 'var(--s2)', border: '1px solid var(--bd)' }}>
              <p className="mb-3 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--tx3)' }}>קטגוריות חדשות</p>
              <form action={newsCatAction} className="mb-3 flex flex-wrap gap-2">
                {newsCatState?.error && (
                  <p className="w-full text-xs text-red-400">{newsCatState.error}</p>
                )}
                <input name="name" required placeholder="שם קטגוריה" className={`${inputCls} flex-1 min-w-32`} />
                <div className="flex items-center gap-2 rounded-xl border px-3" style={{ borderColor: 'rgba(124,58,237,.3)', background: 'var(--inp)' }}>
                  <label className="text-xs font-semibold" style={{ color: 'var(--tx3)' }}>צבע</label>
                  <input name="color" type="color" defaultValue="#6B21A8" className="h-7 w-10 cursor-pointer rounded border-0 bg-transparent" />
                </div>
                <button type="submit" disabled={newsCatPending}
                  className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
                  <Plus size={13} /> הוסף
                </button>
              </form>
              <div className="flex flex-wrap gap-2">
                {newsCategories.map(cat => (
                  <div key={cat.id} className="flex items-center gap-1.5 rounded-full px-3 py-1"
                    style={{ background: cat.color + '22', border: `1px solid ${cat.color}44` }}>
                    <span className="text-xs font-semibold" style={{ color: cat.color }}>{cat.name}</span>
                    <button onClick={() => startTransition(async () => { await deleteNewsCategory(cat.id) })}
                      className="transition hover:opacity-60" style={{ color: cat.color }}>
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Publish form */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-bold" style={{ color: 'var(--tx2)' }}>{newsItems.length} פריטי חדשות</p>
                <button onClick={() => { setShowNewsForm(s => !s); setNewsImgUrl(null) }}
                  className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white transition hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
                  {showNewsForm ? <X size={14} /> : <Plus size={14} />}
                  {showNewsForm ? 'ביטול' : 'פרסם חדשות'}
                </button>
              </div>

              {showNewsForm && (
                <form action={async (fd: FormData) => {
                  if (newsImgUrl) fd.set('image_url', newsImgUrl)
                  await newsAction(fd)
                  setNewsImgUrl(null)
                  setShowNewsForm(false)
                }}
                  className="mb-5 rounded-2xl p-5"
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
                      <textarea name="content" required rows={4} className={`${inputCls} resize-none`} />
                    </div>
                    <div>
                      <label className={labelCls}>קטגוריה</label>
                      <select name="category_id" className={inputCls}>
                        <option value="">ללא קטגוריה</option>
                        {newsCategories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>תאריך תפוגה (אופציונלי)</label>
                      <input name="expires_at" type="datetime-local" className={`${inputCls} [color-scheme:dark]`} dir="ltr" />
                    </div>
                    <div>
                      <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium" style={{ color: 'var(--tx2)' }}>
                        <input name="show_expiry" type="checkbox" className="h-4 w-4 rounded" style={{ accentColor: '#7c3aed' }} />
                        הצג תאריך תפוגה בחדשה
                      </label>
                    </div>
                    <div>
                      <label className={labelCls}>תמונה</label>
                      <div className="flex items-center gap-3">
                        <button type="button"
                          onClick={() => newsImgRef.current?.click()}
                          disabled={newsImgUploading}
                          className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition hover:opacity-80 disabled:opacity-50"
                          style={{ borderColor: 'rgba(124,58,237,.3)', color: 'var(--tx2)', background: 'var(--inp)' }}>
                          <ImageIcon size={14} />
                          {newsImgUploading ? 'מעלה...' : newsImgUrl ? 'החלף תמונה' : 'העלה תמונה'}
                        </button>
                        {newsImgUrl && (
                          <div className="flex items-center gap-2">
                            <img src={newsImgUrl} alt="" className="h-10 w-16 rounded-lg object-cover" style={{ border: '1px solid var(--bd)' }} />
                            <button type="button" onClick={() => setNewsImgUrl(null)}
                              className="text-xs transition hover:opacity-60" style={{ color: 'var(--tx3)' }}>הסר</button>
                          </div>
                        )}
                      </div>
                      <input ref={newsImgRef} type="file" accept="image/*" className="hidden"
                        onChange={async e => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          setNewsImgUploading(true)
                          const { signedUrl, publicUrl, error } = await getNewsImageUploadUrl()
                          if (!error && signedUrl && publicUrl) {
                            await fetch(signedUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
                            setNewsImgUrl(publicUrl)
                          }
                          setNewsImgUploading(false)
                          if (newsImgRef.current) newsImgRef.current.value = ''
                        }}
                      />
                    </div>
                  </div>
                  <button type="submit" disabled={newsPending}
                    className="mt-4 rounded-xl px-5 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
                    {newsPending ? 'מפרסם...' : 'פרסם'}
                  </button>
                </form>
              )}
            </div>

            {/* News list */}
            <div className="space-y-3">
              {newsItems.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-2xl py-16 text-center"
                  style={{ border: '2px dashed var(--bd)', background: 'var(--inp)' }}>
                  <Newspaper size={28} style={{ color: 'var(--tx3)' }} />
                  <p className="text-sm" style={{ color: 'var(--tx3)' }}>אין חדשות עדיין</p>
                </div>
              ) : (
                newsItems.map(item => (
                  <div key={item.id} className="flex items-start gap-3 rounded-2xl p-3"
                    style={{ background: 'var(--s2)', border: '1px solid var(--bd)' }}>
                    {item.image_url
                      ? <img src={item.image_url} alt="" className="h-14 w-20 shrink-0 rounded-xl object-cover" style={{ border: '1px solid var(--bd)' }} />
                      : <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded-xl" style={{ background: 'var(--inp)' }}>
                          <Newspaper size={18} style={{ color: 'var(--tx3)' }} />
                        </div>
                    }
                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 flex items-center gap-2">
                        {item.news_categories && (
                          <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                            style={{ background: item.news_categories.color + '22', color: item.news_categories.color }}>
                            {item.news_categories.name}
                          </span>
                        )}
                        <span className="text-[11px]" style={{ color: 'var(--tx3)' }}>
                          {new Date(item.created_at).toLocaleDateString('he-IL')}
                        </span>
                      </div>
                      <p className="font-semibold line-clamp-1 text-sm" style={{ color: 'var(--tx)' }}>{item.title}</p>
                      <p className="text-xs line-clamp-1" style={{ color: 'var(--tx2)' }}>{item.content}</p>
                      {item.expires_at && (
                        <p className="text-[10px]" style={{ color: new Date(item.expires_at) < new Date() ? '#ef4444' : 'var(--tx3)' }}>
                          תפוגה: {new Date(item.expires_at).toLocaleDateString('he-IL')}
                          {new Date(item.expires_at) < new Date() ? ' · פג תוקף' : ''}
                        </p>
                      )}
                    </div>
                    <button disabled={isPending}
                      onClick={() => startTransition(async () => { await deleteNews(item.id) })}
                      className="shrink-0 rounded-lg p-1.5 transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                      style={{ color: 'var(--tx3)' }}>
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

        {/* ── Reports ── */}
        {activeTab === 'reports' && (() => {
          const filtered = reportFilter === 'all' ? reports : reports.filter(r => r.status === reportFilter)
          const pendingCount = reports.filter(r => r.status === 'pending').length
          const typeLabel: Record<string, string> = {
            message: "הודעת צ׳אט",
            private_message: 'הודעה פרטית',
            forum_reply: 'תגובה בפורום',
            forum_thread: 'נושא בפורום',
            inspiration_post: 'פוסט השראה',
          }
          return (
            <div>
              {/* Filters */}
              <div className="mb-4 flex flex-wrap gap-2">
                {(['pending', 'all', 'reviewed', 'dismissed'] as const).map(f => (
                  <button key={f} onClick={() => setReportFilter(f)}
                    className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition"
                    style={reportFilter === f
                      ? { background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff', boxShadow: '0 4px 12px rgba(124,58,237,.3)' }
                      : { background: 'var(--inp)', border: '1px solid var(--bd)', color: 'var(--tx2)' }}>
                    {f === 'all' ? 'הכל' : f === 'pending' ? 'ממתין' : f === 'reviewed' ? 'טופל' : 'נדחה'}
                    {f === 'pending' && pendingCount > 0 && (
                      <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">{pendingCount}</span>
                    )}
                  </button>
                ))}
              </div>

              {filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-2xl py-16 text-center" style={{ border: '2px dashed var(--bd)', background: 'var(--inp)' }}>
                  <Flag size={28} style={{ color: 'var(--tx3)' }} />
                  <p className="text-sm" style={{ color: 'var(--tx3)' }}>אין דיווחים</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filtered.map(report => (
                    <div key={report.id} className="rounded-2xl p-4" style={{ background: 'var(--s2)', border: '1px solid var(--bd)' }}>
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg,#7c3aed,#ec4899)' }}>
                            {(report.reporter?.full_name ?? report.reporter?.username ?? 'מ')[0].toUpperCase()}
                          </div>
                          <div>
                            <span className="text-xs font-bold" style={{ color: 'var(--tx)' }}>{report.reporter?.full_name ?? report.reporter?.username ?? 'משתמש'}</span>
                            <span className="mx-1.5 text-xs" style={{ color: 'var(--tx3)' }}>דיווח על</span>
                            <span className="text-xs font-bold" style={{ color: '#7c3aed' }}>{typeLabel[report.content_type] ?? report.content_type}</span>
                          </div>
                        </div>
                        <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
                          style={{
                            background: report.status === 'pending' ? 'rgba(245,158,11,.1)' : report.status === 'reviewed' ? 'rgba(16,185,129,.1)' : 'rgba(107,114,128,.1)',
                            color: report.status === 'pending' ? '#f59e0b' : report.status === 'reviewed' ? '#059669' : '#6b7280',
                          }}>
                          {report.status === 'pending' ? 'ממתין' : report.status === 'reviewed' ? 'טופל' : 'נדחה'}
                        </span>
                      </div>

                      <div className="mb-2 flex flex-wrap gap-3 text-xs" style={{ color: 'var(--tx3)' }}>
                        <span>סיבה: <strong style={{ color: 'var(--tx2)' }}>{report.reason}</strong></span>
                        <span>מזהה תוכן: <code className="rounded px-1 text-[10px]" style={{ background: 'var(--inp)', color: 'var(--tx2)' }}>{String(report.content_id).slice(0, 8)}…</code></span>
                        <span>{new Date(report.created_at).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>

                      {report.status === 'pending' && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            disabled={isPending}
                            onClick={() => startTransition(async () => { await updateReportStatus(report.id, 'reviewed') })}
                            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                            style={{ background: 'linear-gradient(135deg,#059669,#047857)' }}>
                            <CheckCircle2 size={12} /> סגור דיווח
                          </button>
                          <button
                            disabled={isPending}
                            onClick={() => startTransition(async () => { await deleteReportedContent(report.id, report.content_type, report.content_id) })}
                            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                            style={{ borderColor: 'rgba(239,68,68,.3)', color: 'var(--tx3)' }}>
                            <Trash2 size={12} /> מחק תוכן
                          </button>
                          <button
                            disabled={isPending}
                            onClick={() => startTransition(async () => { await updateReportStatus(report.id, 'dismissed') })}
                            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:opacity-80 disabled:opacity-50"
                            style={{ borderColor: 'var(--bd)', color: 'var(--tx3)' }}>
                            <XCircle size={12} /> דחה
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })()}

        {/* ── Badges & Designer of Week ── */}
        {activeTab === 'badges' && (
          <BadgesTab
            badges={badges}
            activeUsers={activeUsers}
            userBadgesMap={userBadgesMap}
            designerOfWeek={designerOfWeek}
            createBadge={createBadge}
            deleteBadge={deleteBadge}
            assignBadge={assignBadge}
            revokeBadge={revokeBadge}
            assignBadgeToAll={assignBadgeToAll}
            setDesignerOfWeek={setDesignerOfWeek}
            clearDesignerOfWeek={clearDesignerOfWeek}
          />
        )}

        {/* ── Terms & Privacy ── */}
        {activeTab === 'terms' && (
          <div className="space-y-6">

            {/* Terms of Service */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--s2)', border: '1px solid var(--bd)' }}>
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--bd)' }}>
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-purple-500" />
                  <h3 className="font-bold text-sm" style={{ color: 'var(--tx)' }}>תנאי השימוש</h3>
                </div>
                <div className="flex items-center gap-2">
                  {termsSaved && <span className="text-xs text-emerald-500 font-semibold">✓ נשמר</span>}
                  {termsSaveError && <span className="text-xs text-red-500">{termsSaveError}</span>}
                  <a href="/terms" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs transition hover:opacity-80"
                    style={{ background: 'var(--inp)', border: '1px solid var(--bd)', color: 'var(--tx2)' }}>
                    <ExternalLink size={11} /> צפייה
                  </a>
                  <button
                    disabled={termsSaving}
                    onClick={async () => {
                      setTermsSaving(true); setTermsSaved(false); setTermsSaveError(null)
                      const { error } = await saveTerms(termsText)
                      setTermsSaving(false)
                      if (error) setTermsSaveError(error)
                      else { setTermsSaved(true); setTimeout(() => setTermsSaved(false), 3000) }
                    }}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
                    {termsSaving ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Save size={12} />}
                    שמור
                  </button>
                </div>
              </div>
              <div className="p-4">
                <textarea
                  value={termsText}
                  onChange={e => setTermsText(e.target.value)}
                  rows={18}
                  placeholder="הכנס כאן את תנאי השימוש..."
                  className="w-full resize-y rounded-xl border px-4 py-3 text-sm outline-none transition leading-relaxed"
                  style={{ background: 'var(--inp)', border: '1px solid var(--bd)', color: 'var(--tx)', fontFamily: 'inherit', minHeight: 320 }}
                  dir="rtl"
                />
              </div>
            </div>

            {/* Privacy Policy */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--s2)', border: '1px solid var(--bd)' }}>
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--bd)' }}>
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-blue-500" />
                  <h3 className="font-bold text-sm" style={{ color: 'var(--tx)' }}>מדיניות הפרטיות</h3>
                </div>
                <div className="flex items-center gap-2">
                  {privacySaved && <span className="text-xs text-emerald-500 font-semibold">✓ נשמר</span>}
                  {privacySaveError && <span className="text-xs text-red-500">{privacySaveError}</span>}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs transition hover:opacity-80"
                    style={{ background: 'var(--inp)', border: '1px solid var(--bd)', color: 'var(--tx2)' }}>
                    <ExternalLink size={11} /> צפייה
                  </a>
                  <button
                    disabled={privacySaving}
                    onClick={async () => {
                      setPrivacySaving(true); setPrivacySaved(false); setPrivacySaveError(null)
                      const { error } = await savePrivacy(privacyText)
                      setPrivacySaving(false)
                      if (error) setPrivacySaveError(error)
                      else { setPrivacySaved(true); setTimeout(() => setPrivacySaved(false), 3000) }
                    }}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
                    {privacySaving ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Save size={12} />}
                    שמור
                  </button>
                </div>
              </div>
              <div className="p-4">
                <textarea
                  value={privacyText}
                  onChange={e => setPrivacyText(e.target.value)}
                  rows={18}
                  placeholder="הכנס כאן את מדיניות הפרטיות..."
                  className="w-full resize-y rounded-xl border px-4 py-3 text-sm outline-none transition leading-relaxed"
                  style={{ background: 'var(--inp)', border: '1px solid var(--bd)', color: 'var(--tx)', fontFamily: 'inherit', minHeight: 320 }}
                  dir="rtl"
                />
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  )
}

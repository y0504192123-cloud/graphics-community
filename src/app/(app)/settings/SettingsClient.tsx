'use client'

import { useState, useRef, useActionState } from 'react'
import { User, Lock, Trash2, Camera, Save, CheckCircle2, AlertCircle, Globe, EyeOff } from 'lucide-react'
import { useT } from '@/components/LanguageProvider'
import type { Profile } from '@/types'

type Tab = 'profile' | 'avatar' | 'password' | 'account'

type Props = {
  profile: Profile | null
  email: string
  updateProfile: (fd: FormData) => Promise<{ error?: string }>
  changePassword: (fd: FormData) => Promise<{ error?: string }>
  getAvatarUploadUrl: () => Promise<{ signedUrl?: string; publicUrl?: string; error?: string }>
  saveAvatarUrl: (url: string) => Promise<void>
  deleteAccount: () => Promise<{ error?: string }>
}

const inputCls = 'w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all focus:ring-2'
const labelCls = 'mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest'

function PublicBadge() {
  return (
    <span className="flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold normal-case tracking-normal"
      style={{ background: 'rgba(16,185,129,.1)', color: '#059669', border: '1px solid rgba(16,185,129,.2)' }}>
      <Globe size={8} />
      {/* public label — needs t, rendered inside component via PublicBadge call */}
      גלוי לכולם
    </span>
  )
}

function PrivateBadge() {
  return (
    <span className="flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold normal-case tracking-normal"
      style={{ background: 'rgba(100,116,139,.08)', color: 'var(--tx3)', border: '1px solid var(--bd)' }}>
      <EyeOff size={8} />
      פרטי
    </span>
  )
}

// tabs defined inside component to access t — see below

function Result({ result, successMsg }: { result: { error?: string } | null; successMsg?: string }) {
  if (!result) return null
  if (result.error) return (
    <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.08] px-4 py-3 text-sm text-red-400">
      <AlertCircle size={15} className="shrink-0" />
      {result.error}
    </div>
  )
  return (
    <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.08] px-4 py-3 text-sm text-emerald-400">
      <CheckCircle2 size={15} className="shrink-0" />
      {successMsg ?? '✓'}
    </div>
  )
}

export default function SettingsClient({
  profile, email,
  updateProfile, changePassword, getAvatarUploadUrl, saveAvatarUrl, deleteAccount,
}: Props) {
  const t = useT()
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile',  label: t.settings.tabs.profile,  icon: <User size={15} /> },
    { id: 'avatar',   label: t.settings.tabs.avatar,   icon: <Camera size={15} /> },
    { id: 'password', label: t.settings.tabs.password, icon: <Lock size={15} /> },
    { id: 'account',  label: t.settings.tabs.account,  icon: <Trash2 size={15} /> },
  ]
  const [activeTab, setActiveTab] = useState<Tab>('profile')

  const [profileResult, profileAction, profilePending] = useActionState(
    async (_: { error?: string } | null, fd: FormData) => updateProfile(fd),
    null
  )
  const [passwordResult, passwordAction, passwordPending] = useActionState(
    async (_: { error?: string } | null, fd: FormData) => changePassword(fd),
    null
  )

  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url ?? null)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const avatarRef = useRef<HTMLInputElement>(null)

  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const displayName = profile?.full_name ?? profile?.username ?? email.split('@')[0]
  const initials = displayName.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()

  const inputStyle = {
    background: 'var(--inp)',
    border: '1px solid var(--bd)',
    color: 'var(--tx)',
    '--tw-ring-color': 'rgba(124,58,237,.25)',
  } as React.CSSProperties

  return (
    <div className="min-h-full" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <div className="relative overflow-hidden px-6 py-8" style={{ background: 'var(--hero)' }}>
        <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(124,58,237,.06) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="relative mx-auto max-w-2xl">
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-lg font-bold text-white shadow-lg"
              style={{ background: profile?.avatar_color ?? 'linear-gradient(135deg, #7c3aed, #ec4899)' }}
            >
              {avatarUrl
                ? <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                : <span>{initials}</span>
              }
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--tx)' }}>הגדרות חשבון</h1>
              <p className="text-sm" style={{ color: 'var(--tx3)' }} dir="ltr">{email}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-6 py-6">

        {/* Tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200"
              style={activeTab === tab.id
                ? { background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: 'white', boxShadow: '0 4px 16px rgba(124,58,237,.35)' }
                : { background: 'var(--inp)', border: '1px solid var(--bd)', color: 'var(--tx2)' }
              }
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Profile Tab ── */}
        {activeTab === 'profile' && (
          <div className="rounded-2xl p-6" style={{ background: 'var(--s2)', border: '1px solid var(--bd)' }}>
            <h2 className="mb-5 text-base font-bold" style={{ color: 'var(--tx)' }}>עדכון פרטים אישיים</h2>

            <form action={profileAction} className="space-y-4">
              <div>
                <label className={labelCls} style={{ color: 'var(--tx3)' }}>שם מלא <PublicBadge /></label>
                <input
                  name="full_name"
                  className={inputCls}
                  style={inputStyle}
                  defaultValue={profile?.full_name ?? ''}
                />
              </div>
              <div>
                <label className={labelCls} style={{ color: 'var(--tx3)' }}>ביוגרפיה קצרה <PublicBadge /></label>
                <textarea
                  name="bio"
                  rows={3}
                  className={`${inputCls} resize-none`}
                  style={inputStyle}
                  defaultValue={profile?.bio ?? ''}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls} style={{ color: 'var(--tx3)' }}>עיר <PublicBadge /></label>
                  <input
                    name="city"
                    className={inputCls}
                    style={inputStyle}
                    defaultValue={profile?.city ?? ''}
                  />
                </div>
                <div>
                  <label className={labelCls} style={{ color: 'var(--tx3)' }}>שנות ניסיון <PublicBadge /></label>
                  <input
                    name="years_experience"
                    type="number"
                    min="0"
                    max="50"
                    onWheel={(e) => e.currentTarget.blur()}
                    className={`${inputCls} [appearance:textfield]`}
                    style={inputStyle}
                    defaultValue={profile?.years_experience ?? ''}
                    dir="ltr"
                  />
                </div>
              </div>
              <div>
                <label className={labelCls} style={{ color: 'var(--tx3)' }}>טלפון <PrivateBadge /></label>
                <input
                  name="phone"
                  type="tel"
                  className={inputCls}
                  style={inputStyle}
                  defaultValue={profile?.phone ?? ''}
                  dir="ltr"
                />
              </div>
              <div>
                <label className={labelCls} style={{ color: 'var(--tx3)' }}>קישור לתיק עבודות <PublicBadge /></label>
                <input
                  name="portfolio_url"
                  type="url"
                  className={inputCls}
                  style={inputStyle}
                  defaultValue={profile?.portfolio_url ?? ''}
                  dir="ltr"
                />
              </div>

              {profileResult !== undefined && <Result result={profileResult} successMsg={t.settings.saved} />}

              <button
                type="submit"
                disabled={profilePending}
                className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
              >
                {profilePending
                  ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  : <Save size={14} />
                }
                {profilePending ? 'שומר...' : 'שמור שינויים'}
              </button>
            </form>
          </div>
        )}

        {/* ── Avatar Tab ── */}
        {activeTab === 'avatar' && (
          <div className="rounded-2xl p-6" style={{ background: 'var(--s2)', border: '1px solid var(--bd)' }}>
            <div className="mb-5 flex items-center gap-3">
              <h2 className="text-base font-bold" style={{ color: 'var(--tx)' }}>תמונת פרופיל</h2>
              <PublicBadge />
            </div>

            <div className="mb-6 flex flex-col items-center gap-5">
              <div
                className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full text-3xl font-bold text-white shadow-xl"
                style={{ background: profile?.avatar_color ?? 'linear-gradient(135deg, #7c3aed, #ec4899)' }}
              >
                {avatarUrl
                  ? <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                  : <span>{initials}</span>
                }
              </div>

              {avatarError && (
                <p className="text-xs text-red-400">{avatarError}</p>
              )}

              <input
                ref={avatarRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  setAvatarUploading(true)
                  setAvatarError(null)
                  const { signedUrl, publicUrl, error } = await getAvatarUploadUrl()
                  if (error || !signedUrl || !publicUrl) {
                    setAvatarError(error ?? 'שגיאה בהעלאה')
                    setAvatarUploading(false)
                    return
                  }
                  const res = await fetch(signedUrl, {
                    method: 'PUT',
                    body: file,
                    headers: { 'Content-Type': file.type },
                  })
                  if (!res.ok) {
                    setAvatarError('ההעלאה נכשלה')
                    setAvatarUploading(false)
                    return
                  }
                  await saveAvatarUrl(publicUrl)
                  setAvatarUrl(publicUrl)
                  setAvatarUploading(false)
                  if (avatarRef.current) avatarRef.current.value = ''
                }}
              />

              <div className="flex gap-3">
                <button
                  onClick={() => avatarRef.current?.click()}
                  disabled={avatarUploading}
                  className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
                >
                  <Camera size={14} />
                  {avatarUploading ? 'מעלה...' : avatarUrl ? 'החלף תמונה' : 'העלה תמונה'}
                </button>
              </div>
            </div>

            <p className="text-center text-xs" style={{ color: 'var(--tx3)' }}>
              לניהול מלא של תמונת הפרופיל, גלריה ותחומי התמחות — עבור ל
              <a href="/profile" className="mx-1 text-purple-400 underline underline-offset-2 hover:text-purple-300 transition">דף הפרופיל</a>
            </p>
          </div>
        )}

        {/* ── Password Tab ── */}
        {activeTab === 'password' && (
          <div className="rounded-2xl p-6" style={{ background: 'var(--s2)', border: '1px solid var(--bd)' }}>
            <h2 className="mb-5 text-base font-bold" style={{ color: 'var(--tx)' }}>שינוי סיסמה</h2>

            <form action={passwordAction} className="space-y-4">
              <div>
                <label className={labelCls} style={{ color: 'var(--tx3)' }}>סיסמה חדשה</label>
                <input
                  name="new_password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className={inputCls}
                  style={inputStyle}
                  dir="ltr"
                />
              </div>
              <div>
                <label className={labelCls} style={{ color: 'var(--tx3)' }}>אימות סיסמה</label>
                <input
                  name="confirm_password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className={inputCls}
                  style={inputStyle}
                  dir="ltr"
                />
              </div>

              {passwordResult !== undefined && (
                passwordResult?.error ? (
                  <Result result={passwordResult} />
                ) : passwordResult === null ? null : (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.08] px-4 py-3 text-sm text-emerald-400">
                    <CheckCircle2 size={15} className="shrink-0" />
                    הסיסמה שונתה בהצלחה
                  </div>
                )
              )}

              <button
                type="submit"
                disabled={passwordPending}
                className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
              >
                {passwordPending
                  ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  : <Lock size={14} />
                }
                {passwordPending ? 'מעדכן...' : 'עדכן סיסמה'}
              </button>
            </form>
          </div>
        )}

        {/* ── Account Tab ── */}
        {activeTab === 'account' && (
          <div className="space-y-5">
            <div className="rounded-2xl p-6" style={{ background: 'var(--s2)', border: '1px solid var(--bd)' }}>
              <div className="mb-1 flex items-center gap-2">
                <p className="text-sm font-semibold" style={{ color: 'var(--tx)' }}>אימייל</p>
                <PrivateBadge />
              </div>
              <p className="text-sm" style={{ color: 'var(--tx3)' }} dir="ltr">{email}</p>
            </div>

            <div
              className="rounded-2xl p-6"
              style={{ background: 'rgba(239,68,68,.04)', border: '1px solid rgba(239,68,68,.2)' }}
            >
              <h2 className="mb-2 text-base font-bold text-red-400">מחיקת חשבון</h2>
              <p className="mb-4 text-sm leading-relaxed" style={{ color: 'var(--tx3)' }}>
                פעולה זו תמחק את החשבון שלך לצמיתות, כולל כל הנתונים, ההודעות והעבודות. לא ניתן לבטל פעולה זו.
              </p>

              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-semibold text-red-400">
                  הקלד את המילה <strong>מחק</strong> לאישור
                </label>
                <input
                  type="text"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition"
                  style={{ background: 'var(--inp)', borderColor: 'rgba(239,68,68,.3)', color: 'var(--tx)' }}
                  placeholder="מחק"
                />
              </div>

              {deleteError && (
                <p className="mb-3 text-xs text-red-400">{deleteError}</p>
              )}

              <button
                disabled={deleteConfirm !== 'מחק' || deleteLoading}
                onClick={async () => {
                  setDeleteLoading(true)
                  setDeleteError(null)
                  const result = await deleteAccount()
                  if (result?.error) {
                    setDeleteError(result.error)
                    setDeleteLoading(false)
                  }
                }}
                className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}
              >
                {deleteLoading
                  ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  : <Trash2 size={14} />
                }
                {deleteLoading ? 'מוחק...' : 'מחק חשבון לצמיתות'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Briefcase, Clock, CheckCircle2, Flame, MapPin, ChevronDown } from 'lucide-react'
import type { Job, Profile } from '@/types'

type Props = {
  jobs: (Job & { profiles: Profile | null })[]
  currentUserId: string
  categories: string[]
  createJob: (formData: FormData) => Promise<void>
  applyToJob: (jobId: string, formData: FormData) => Promise<void>
}

const statusConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  open:        { label: 'פתוח',   color: 'text-emerald-400', bg: 'rgba(52,211,153,.1)',  dot: '#34d399' },
  closed:      { label: 'סגור',   color: 'text-red-400',     bg: 'rgba(248,113,113,.1)', dot: '#f87171' },
  in_progress: { label: 'בתהליך', color: 'text-blue-400',    bg: 'rgba(96,165,250,.1)',  dot: '#60a5fa' },
}

const inputCls = 'w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-slate-100 outline-none transition-all focus:border-purple-500/50 focus:bg-white/[0.06] focus:ring-2 focus:ring-purple-500/20 placeholder:text-slate-600'
const labelCls = 'mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-500'

const categoryIcons: Record<string, string> = {
  'לוגואים ומיתוג': '⚡',
  'עיצוב דפוס': '📄',
  'מדיה חברתית': '📱',
  'אמנות דיגיטלית': '🎨',
  'עיצוב אינטרנט': '🌐',
  'פוסטרים ומודעות': '📢',
  'עיצוב אריזות': '📦',
  'אחר': '✦',
}

export default function JobsClient({ jobs, currentUserId, categories, createJob, applyToJob }: Props) {
  const router = useRouter()
  const [showCreate, setShowCreate] = useState(false)
  const [applyingTo, setApplyingTo] = useState<string | null>(null)
  const [filterCat, setFilterCat] = useState<string>('הכל')
  const [isPending, startTransition] = useTransition()

  const filtered = filterCat === 'הכל' ? jobs : jobs.filter((j) => j.category === filterCat)
  const openCount = jobs.filter((j) => j.status === 'open').length

  return (
    <div className="min-h-full" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <div
        className="relative overflow-hidden px-6 py-8"
        style={{ background: 'linear-gradient(135deg, var(--s2) 0%, var(--bg) 70%)' }}
      >
        <div className="pointer-events-none absolute -top-20 start-0 h-60 w-60 rounded-full opacity-25" style={{ background: 'radial-gradient(circle, rgba(99,102,241,.6) 0%, transparent 70%)', filter: 'blur(50px)' }} />
        <div className="pointer-events-none absolute -bottom-10 end-20 h-40 w-40 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, rgba(124,58,237,.5) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div className="grid-pattern absolute inset-0 opacity-40" />

        <div className="relative mx-auto max-w-5xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold text-emerald-400" style={{ background: 'rgba(52,211,153,.1)', border: '1px solid rgba(52,211,153,.2)' }}>
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                  {openCount} פתוחות
                </span>
              </div>
              <h1 className="text-2xl font-bold text-white lg:text-3xl">לוח עבודות</h1>
              <p className="mt-1 text-sm text-slate-400">מצא עבודות עיצוב מהקהילה</p>
            </div>
            <button
              onClick={() => setShowCreate((s) => !s)}
              className="flex w-fit items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 4px 20px rgba(124,58,237,.4)' }}
            >
              <Plus size={16} />
              פרסם עבודה
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-6">

        {/* Create form */}
        {showCreate && (
          <form
            className="mb-6 animate-fade-up rounded-2xl p-6"
            style={{ background: 'rgba(124,58,237,.05)', border: '1px solid rgba(124,58,237,.2)' }}
            action={(formData) => {
              startTransition(async () => {
                await createJob(formData)
                setShowCreate(false)
                router.refresh()
              })
            }}
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-bold text-purple-300">פרסום עבודה חדשה</h3>
              <button type="button" onClick={() => setShowCreate(false)} className="text-slate-500 hover:text-slate-300">
                <X size={16} />
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelCls}>כותרת העבודה</label>
                <input name="title" required className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>קטגוריה</label>
                <select name="category" className={inputCls}>
                  <option value="">בחר קטגוריה</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>תקציב מינימום (₪)</label>
                <input
                  name="budget_min"
                  type="number"
                  min="0"
                  onWheel={(e) => e.currentTarget.blur()}
                  className={`${inputCls} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none`}
                />
              </div>
              <div>
                <label className={labelCls}>תקציב מקסימום (₪)</label>
                <input
                  name="budget_max"
                  type="number"
                  min="0"
                  onWheel={(e) => e.currentTarget.blur()}
                  className={`${inputCls} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none`}
                />
              </div>
              <div>
                <label className={labelCls}>דדליין</label>
                <input
                  name="deadline"
                  type="date"
                  className={inputCls}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>תיאור מפורט</label>
                <textarea name="description" required rows={3} className={`${inputCls} resize-none`} />
              </div>
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="mt-5 rounded-xl px-6 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
            >
              {isPending ? 'מפרסם...' : 'פרסם עבודה'}
            </button>
          </form>
        )}

        {/* Category filters */}
        <div className="mb-6 flex flex-wrap gap-2">
          {['הכל', ...categories].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ${
                filterCat === cat
                  ? 'text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              style={filterCat === cat
                ? { background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 2px 12px rgba(124,58,237,.4)' }
                : { background: 'var(--inp)', border: '1px solid var(--bd)' }
              }
            >
              {cat !== 'הכל' && <span>{categoryIcons[cat]}</span>}
              {cat}
            </button>
          ))}
        </div>

        {/* Job list */}
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div
              className="flex flex-col items-center justify-center gap-4 rounded-2xl py-16 text-center"
              style={{ border: '2px dashed var(--bd)', background: 'var(--inp)' }}
            >
              <Briefcase size={32} className="text-slate-700" />
              <div>
                <p className="font-semibold text-slate-400">אין עבודות בקטגוריה זו</p>
                <p className="mt-1 text-sm text-slate-600">נסה קטגוריה אחרת או חזור מאוחר יותר</p>
              </div>
            </div>
          )}

          {filtered.map((job, i) => {
            const status = statusConfig[job.status]
            const isOwn = job.client_id === currentUserId
            const isApplying = applyingTo === job.id

            return (
              <div
                key={job.id}
                className="group animate-fade-up overflow-hidden rounded-2xl transition-all duration-300 hover:translate-y-[-1px]"
                style={{
                  background: 'var(--s2)',
                  border: '1px solid var(--bd)',
                  boxShadow: '0 2px 12px rgba(0,0,0,.12)',
                  animationDelay: `${i * 50}ms`,
                }}
              >
                {/* Card hover left accent */}
                <div className="flex">
                  <div
                    className="w-1 shrink-0 rounded-s-2xl transition-all duration-300 group-hover:opacity-100"
                    style={{ background: job.status === 'open' ? 'linear-gradient(to bottom, #34d399, #059669)' : job.status === 'in_progress' ? 'linear-gradient(to bottom, #60a5fa, #3b82f6)' : 'rgba(255,255,255,.1)' }}
                  />

                  <div className="flex-1 p-5">
                    <div className="mb-3 flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-slate-100 group-hover:text-white">{job.title}</h3>
                          <span
                            className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.color}`}
                            style={{ background: status.bg }}
                          >
                            <span className="h-1.5 w-1.5 rounded-full" style={{ background: status.dot }} />
                            {status.label}
                          </span>
                          {job.category && (
                            <span
                              className="rounded-full px-2.5 py-0.5 text-xs text-slate-400"
                              style={{ background: 'var(--inp)', border: '1px solid var(--bd)' }}
                            >
                              {categoryIcons[job.category]} {job.category}
                            </span>
                          )}
                          {isOwn && (
                            <span className="rounded-full px-2.5 py-0.5 text-xs text-purple-400" style={{ background: 'rgba(124,58,237,.1)' }}>
                              הפרסום שלך
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <div className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold" style={{ background: 'var(--inph)', color: 'var(--tx2)' }}>
                              {(job.profiles?.full_name ?? 'א')[0]}
                            </div>
                            {job.profiles?.full_name ?? 'לקוח אנונימי'}
                          </span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Clock size={11} />
                            {new Date(job.created_at).toLocaleDateString('he-IL')}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin size={11} />
                            ישראל
                          </span>
                        </div>
                      </div>

                      {(job.budget_min != null || job.budget_max != null) && (
                        <div
                          className="shrink-0 rounded-xl px-4 py-2 text-center"
                          style={{ background: 'rgba(124,58,237,.1)', border: '1px solid rgba(124,58,237,.2)' }}
                        >
                          <p className="text-xs text-slate-500">תקציב</p>
                          <p className="text-lg font-bold text-purple-300">
                            {job.budget_min != null && job.budget_max != null
                              ? `₪${job.budget_min.toLocaleString()}–₪${job.budget_max.toLocaleString()}`
                              : job.budget_min != null
                              ? `₪${job.budget_min.toLocaleString()}+`
                              : `עד ₪${job.budget_max!.toLocaleString()}`}
                          </p>
                        </div>
                      )}
                    </div>

                    <p className="mb-4 text-sm leading-relaxed text-slate-400 line-clamp-2">{job.description}</p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {job.status === 'open' && !isOwn && (
                          <span className="flex items-center gap-1 text-xs text-amber-400">
                            <Flame size={11} />
                            פעיל
                          </span>
                        )}
                        {isOwn && (
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <CheckCircle2 size={12} />
                            פרסמת את זה
                          </span>
                        )}
                      </div>

                      {!isOwn && job.status === 'open' && (
                        <button
                          onClick={() => setApplyingTo(isApplying ? null : job.id)}
                          className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all duration-200 hover:scale-[1.03]"
                          style={isApplying
                            ? { background: 'rgba(124,58,237,.2)', border: '1px solid rgba(124,58,237,.4)', color: '#c084fc' }
                            : { background: 'rgba(124,58,237,.1)', border: '1px solid rgba(124,58,237,.25)', color: '#a78bfa' }
                          }
                        >
                          {isApplying ? 'סגור' : 'הגש הצעה'}
                          <ChevronDown size={12} className={`transition-transform duration-200 ${isApplying ? 'rotate-180' : ''}`} />
                        </button>
                      )}
                    </div>

                    {/* Apply form */}
                    {isApplying && (
                      <form
                        className="mt-4 animate-fade-up pt-4"
                        style={{ borderTop: '1px solid var(--bd)' }}
                        action={(formData) => {
                          startTransition(async () => {
                            await applyToJob(job.id, formData)
                            setApplyingTo(null)
                            router.refresh()
                          })
                        }}
                      >
                        <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">הצעה שלך</h4>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className={labelCls}>מחיר מוצע (₪)</label>
                            <input
                              name="price"
                              type="number"
                              min="0"
                              onWheel={(e) => e.currentTarget.blur()}
                              className={`${inputCls} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none`}
                              style={{ background: 'rgba(255,255,255,.03)' }}
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className={labelCls}>תיאור ההצעה</label>
                            <textarea
                              name="content"
                              required
                              rows={2}
                              className={`${inputCls} resize-none`}
                              style={{ background: 'rgba(255,255,255,.03)' }}
                            />
                          </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button
                            type="submit"
                            disabled={isPending}
                            className="rounded-xl px-5 py-2 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                            style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
                          >
                            {isPending ? 'שולח...' : 'שלח הצעה'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setApplyingTo(null)}
                            className="rounded-xl border border-white/[0.08] px-4 py-2 text-xs text-slate-500 hover:text-slate-300"
                          >
                            ביטול
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

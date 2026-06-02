'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Briefcase, Clock, ChevronDown, Trash2, Calendar, MessageCircle } from 'lucide-react'
import type { Job, Profile } from '@/types'

type Props = {
  jobs: (Job & { profiles: Profile | null })[]
  currentUserId: string
  isAdmin: boolean
  categories: string[]
  createJob: (formData: FormData) => Promise<void>
  applyToJob: (jobId: string, formData: FormData) => Promise<void>
  changeJobStatus: (jobId: string, status: string) => Promise<void>
  deleteJob: (jobId: string) => Promise<void>
}

const statusConfig: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  open:        { label: 'פתוח',    color: 'text-emerald-700', bg: 'rgba(52,211,153,.12)',  border: 'rgba(52,211,153,.35)',  dot: '#059669' },
  in_progress: { label: 'בתהליך', color: 'text-amber-700',   bg: 'rgba(251,191,36,.12)',  border: 'rgba(251,191,36,.35)',  dot: '#d97706' },
  closed:      { label: 'נסגר',   color: 'text-red-600',     bg: 'rgba(248,113,113,.12)', border: 'rgba(248,113,113,.35)', dot: '#dc2626' },
}

const accentColor: Record<string, string> = {
  open:        'linear-gradient(to bottom, #34d399, #059669)',
  in_progress: 'linear-gradient(to bottom, #fbbf24, #d97706)',
  closed:      'linear-gradient(to bottom, #f87171, #dc2626)',
}

const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all hover:border-slate-300 focus:border-purple-400 focus:ring-2 focus:ring-purple-100'
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatBudget(min: number | null, max: number | null) {
  if (min != null && max != null) return `₪${min.toLocaleString()} – ₪${max.toLocaleString()}`
  if (min != null) return `מ-₪${min.toLocaleString()}`
  if (max != null) return `עד ₪${max.toLocaleString()}`
  return null
}

export default function JobsClient({
  jobs, currentUserId, isAdmin, categories,
  createJob, applyToJob, changeJobStatus, deleteJob,
}: Props) {
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
        style={{ background: 'var(--hero)' }}
      >
        <div className="pointer-events-none absolute -top-20 start-0 h-60 w-60 rounded-full opacity-25" style={{ background: 'radial-gradient(circle, rgba(99,102,241,.6) 0%, transparent 70%)', filter: 'blur(50px)' }} />
        <div className="pointer-events-none absolute -bottom-10 end-20 h-40 w-40 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, rgba(124,58,237,.5) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div className="grid-pattern absolute inset-0 opacity-40" />
        <div className="relative mx-auto max-w-5xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold text-emerald-700" style={{ background: 'rgba(52,211,153,.12)', border: '1px solid rgba(52,211,153,.35)' }}>
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                  {openCount} פתוחות
                </span>
              </div>
              <h1 className="text-2xl font-bold lg:text-3xl" style={{ color: 'var(--tx)' }}>לוח עבודות</h1>
              <p className="mt-1 text-sm" style={{ color: 'var(--tx2)' }}>מצא עבודות עיצוב מהקהילה</p>
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
              <h3 className="font-bold text-purple-700">פרסום עבודה חדשה</h3>
              <button type="button" onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600">
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
                <label className={labelCls}>דדליין</label>
                <input name="deadline" type="date" className={inputCls} />
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
              <div className="sm:col-span-2">
                <label className={labelCls}>תיאור מפורט</label>
                <textarea name="description" required rows={4} className={`${inputCls} resize-none`} />
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
                filterCat === cat ? 'text-white shadow-lg' : 'hover:text-slate-700'
              }`}
              style={filterCat === cat
                ? { background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 2px 12px rgba(124,58,237,.4)' }
                : { background: 'var(--inp)', border: '1px solid var(--bd)' }
              }
            >
              {cat !== 'הכל' && <span>{categoryIcons[cat] ?? '•'}</span>}
              {cat}
            </button>
          ))}
        </div>

        {/* Job list */}
        <div className="space-y-4">
          {filtered.length === 0 && (
            <div
              className="flex flex-col items-center justify-center gap-4 rounded-2xl py-16 text-center"
              style={{ border: '2px dashed var(--bd)', background: 'var(--inp)' }}
            >
              <Briefcase size={32} style={{ color: 'var(--tx3)' }} />
              <div>
                <p className="font-semibold" style={{ color: 'var(--tx2)' }}>אין עבודות בקטגוריה זו</p>
                <p className="mt-1 text-sm" style={{ color: 'var(--tx3)' }}>נסה קטגוריה אחרת או חזור מאוחר יותר</p>
              </div>
            </div>
          )}

          {filtered.map((job, i) => {
            const st = statusConfig[job.status] ?? statusConfig.open
            const isOwn = job.client_id === currentUserId
            const canDelete = isOwn || isAdmin
            const isApplying = applyingTo === job.id
            const budget = formatBudget(job.budget_min, job.budget_max)

            return (
              <div
                key={job.id}
                className="group animate-fade-up overflow-hidden rounded-2xl transition-all duration-300 hover:translate-y-[-1px]"
                style={{
                  background: 'var(--s2)',
                  border: '1px solid var(--bd)',
                  boxShadow: '0 2px 16px rgba(0,0,0,.14)',
                  animationDelay: `${i * 50}ms`,
                }}
              >
                <div className="flex">
                  {/* Left accent bar */}
                  <div className="w-1 shrink-0 rounded-s-2xl" style={{ background: accentColor[job.status] ?? accentColor.open }} />

                  <div className="flex-1 p-5">

                    {/* Top row: title + badges + budget */}
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <h3 className="font-bold group-hover:text-purple-700" style={{ color: 'var(--tx)' }}>{job.title}</h3>

                          {/* Status badge */}
                          <span
                            className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.color}`}
                            style={{ background: st.bg, border: `1px solid ${st.border}` }}
                          >
                            <span className="h-1.5 w-1.5 rounded-full" style={{ background: st.dot }} />
                            {st.label}
                          </span>

                          {job.category && (
                            <span
                              className="rounded-full px-2.5 py-0.5 text-xs"
                              style={{ background: 'var(--inp)', border: '1px solid var(--bd)', color: 'var(--tx2)' }}
                            >
                              {categoryIcons[job.category] ?? ''} {job.category}
                            </span>
                          )}

                          {isOwn && (
                            <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-purple-700" style={{ background: 'rgba(124,58,237,.1)', border: '1px solid rgba(124,58,237,.2)' }}>
                              הפרסום שלך
                            </span>
                          )}
                        </div>

                        {/* Publisher + date */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold" style={{ background: 'var(--inph)', color: 'var(--tx2)' }}>
                              {(job.profiles?.full_name ?? 'א')[0]}
                            </div>
                            {job.profiles?.full_name ?? 'לקוח אנונימי'}
                          </span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Clock size={11} />
                            פורסם {formatDate(job.created_at)}
                          </span>
                          {job.deadline && (
                            <>
                              <span>·</span>
                              <span className="flex items-center gap-1 text-amber-700">
                                <Calendar size={11} />
                                דדליין: {formatDate(job.deadline)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Budget box */}
                      {budget && (
                        <div
                          className="shrink-0 rounded-xl px-4 py-2 text-center"
                          style={{ background: 'rgba(124,58,237,.1)', border: '1px solid rgba(124,58,237,.2)' }}
                        >
                          <p className="text-xs text-slate-500">תקציב</p>
                          <p className="whitespace-nowrap text-base font-bold text-purple-700">{budget}</p>
                        </div>
                      )}
                    </div>

                    {/* Full description */}
                    <p className="mb-4 text-sm leading-relaxed" style={{ color: 'var(--tx2)' }}>{job.description}</p>

                    {/* Bottom row: status changer (owner) + apply (other) + delete */}
                    <div className="flex flex-wrap items-center gap-2">

                      {/* Status change — owner only (open/closed) */}
                      {isOwn && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-500">סטטוס:</span>
                          {(['open', 'closed'] as const).map((s) => {
                            const cfg = statusConfig[s]
                            const active = job.status === s
                            return (
                              <button
                                key={s}
                                disabled={active || isPending}
                                onClick={() => startTransition(async () => { await changeJobStatus(job.id, s); router.refresh() })}
                                className="rounded-lg px-2.5 py-1 text-xs font-semibold transition-all disabled:cursor-default"
                                style={active
                                  ? { background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.dot }
                                  : { background: 'var(--inp)', border: '1px solid var(--bd)', color: 'var(--tx2)', opacity: isPending ? 0.5 : 1 }
                                }
                              >
                                {cfg.label}
                              </button>
                            )
                          })}
                        </div>
                      )}

                      <div className="ms-auto flex items-center gap-2">
                        {/* Contact publisher — non-owners */}
                        {!isOwn && (
                          <button
                            onClick={() => {
                              const budget = formatBudget(job.budget_min, job.budget_max)
                              const params = new URLSearchParams({ dm: job.client_id, jobTitle: job.title })
                              if (budget) params.set('jobBudget', budget)
                              if (job.description) params.set('jobDesc', job.description.slice(0, 100))
                              router.push(`/chat?${params.toString()}`)
                            }}
                            className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all duration-200 hover:scale-[1.03]"
                            style={{ background: 'rgba(52,211,153,.08)', border: '1px solid rgba(52,211,153,.2)', color: '#34d399' }}
                          >
                            <MessageCircle size={12} />
                            פנה למפרסם
                          </button>
                        )}

                        {/* Apply button — non-owners, open jobs */}
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

                        {/* Delete button — owner or admin */}
                        {canDelete && (
                          <button
                            disabled={isPending}
                            onClick={() => {
                              if (confirm('למחוק את המשרה הזו?')) {
                                startTransition(async () => { await deleteJob(job.id); router.refresh() })
                              }
                            }}
                            className="rounded-xl border p-2 text-slate-500 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                            style={{ borderColor: 'var(--bd)' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
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
                        <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">הצעה שלך</h4>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className={labelCls}>מחיר מוצע (₪)</label>
                            <input
                              name="price"
                              type="number"
                              min="0"
                              onWheel={(e) => e.currentTarget.blur()}
                              className={`${inputCls} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none`}
                              style={{ background: 'var(--inp)' }}
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className={labelCls}>תיאור ההצעה</label>
                            <textarea
                              name="content"
                              required
                              rows={2}
                              className={`${inputCls} resize-none`}
                              style={{ background: 'var(--inp)' }}
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
                            className="rounded-xl border border-slate-200 px-4 py-2 text-xs text-slate-500 hover:border-slate-300 hover:text-slate-700"
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

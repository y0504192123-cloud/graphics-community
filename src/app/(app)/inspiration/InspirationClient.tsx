'use client'

import { useState, useTransition, useActionState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Upload, MessageSquare, X, ImageIcon, Plus, Trash2 } from 'lucide-react'
import type { InspirationPost } from '@/types'

const CATEGORIES = [
  'לוגו', 'מיתוג', 'סושיאל מדיה', 'פרסום', 'אינפוגרפיקה',
  'אילוסטרציה', 'עיצוב אתרים', 'הדפסה', 'מוצרי פרמיום', 'וידאו ומושן', 'אחר',
]

const inputCls = 'w-full rounded-xl border bg-white/[0.04] px-4 py-2.5 text-sm text-slate-100 outline-none transition-all placeholder:text-slate-600 focus:bg-white/[0.06] focus:ring-2 focus:ring-purple-500/20'
const labelCls = 'mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-500'

type Props = {
  posts: InspirationPost[]
  currentUserId: string
  uploadPost: (prev: { error?: string } | null, fd: FormData) => Promise<{ error?: string } | null>
  deletePost: (id: string) => Promise<void>
}

export default function InspirationClient({ posts, currentUserId, uploadPost, deletePost }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [state, formAction, pending] = useActionState(uploadPost, null)
  const formRef = useRef<HTMLFormElement>(null)
  const prevPendingRef = useRef(false)

  useEffect(() => {
    if (prevPendingRef.current && !pending && state === null) {
      setShowModal(false)
      setPreview(null)
      formRef.current?.reset()
    }
    prevPendingRef.current = pending
  }, [pending, state])

  const closeModal = () => {
    setShowModal(false)
    setPreview(null)
    formRef.current?.reset()
  }

  return (
    <div className="min-h-full" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <div
        className="relative overflow-hidden px-6 py-8"
        style={{ background: 'linear-gradient(135deg, #1a0533 0%, var(--bg) 70%)' }}
      >
        <div className="pointer-events-none absolute -top-20 end-0 h-60 w-60 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, rgba(124,58,237,.6) 0%, transparent 70%)', filter: 'blur(50px)' }} />
        <div className="grid-pattern absolute inset-0 opacity-40" />
        <div className="relative mx-auto max-w-6xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-white">ספריית השראה</h1>
              <p className="mt-0.5 text-sm text-slate-400">עיצובים מהקהילה — שתפו, העירו, התעוררו</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex shrink-0 items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
            >
              <Plus size={16} />
              העלה עיצוב
            </button>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="mx-auto max-w-6xl px-6 py-6">
        {posts.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl py-20 text-center" style={{ border: '2px dashed var(--bd)', background: 'var(--inp)' }}>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: 'rgba(124,58,237,.1)', border: '1px solid rgba(124,58,237,.2)' }}>
              <ImageIcon size={28} className="text-purple-400" />
            </div>
            <p className="font-semibold text-slate-300">אין עיצובים עדיין</p>
            <p className="text-sm text-slate-500">היו הראשונים לשתף עיצוב בקהילה!</p>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
            >
              <Upload size={15} />
              העלה עיצוב ראשון
            </button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={currentUserId}
                onDelete={(id) => startTransition(async () => { await deletePost(id) })}
                isPending={isPending}
              />
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(8px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl"
            style={{ background: 'var(--s1)', border: '1px solid var(--bd)' }}
          >
            <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: 'var(--bd)' }}>
              <h2 className="text-lg font-bold text-white">העלאת עיצוב</h2>
              <button onClick={closeModal} className="rounded-lg p-1 text-slate-500 transition hover:text-slate-300">
                <X size={20} />
              </button>
            </div>

            <form ref={formRef} action={formAction} className="max-h-[80vh] overflow-y-auto p-6">
              <div className="space-y-4">
                {state?.error && (
                  <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{state.error}</p>
                )}

                {/* Image upload */}
                <div>
                  <label className={labelCls}>תמונה *</label>
                  <label
                    className="flex cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl transition-colors"
                    style={{ border: '2px dashed rgba(124,58,237,.4)', background: 'rgba(124,58,237,.04)', minHeight: '160px' }}
                  >
                    {preview ? (
                      <img src={preview} alt="preview" className="max-h-48 w-full object-contain" />
                    ) : (
                      <>
                        <Upload size={24} className="text-purple-400" />
                        <span className="text-sm text-slate-500">לחץ לבחירת תמונה</span>
                        <span className="text-xs text-slate-700">JPG, PNG, WebP — עד 10MB</span>
                      </>
                    )}
                    <input
                      type="file"
                      name="image"
                      accept="image/*"
                      required
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) setPreview(URL.createObjectURL(f))
                      }}
                    />
                  </label>
                </div>

                <div>
                  <label className={labelCls}>כותרת *</label>
                  <input name="title" required placeholder="שם העיצוב" className={inputCls} style={{ borderColor: 'rgba(124,58,237,.3)' }} />
                </div>

                <div>
                  <label className={labelCls}>תיאור</label>
                  <textarea name="description" rows={2} placeholder="תיאור קצר..." className={`${inputCls} resize-none`} style={{ borderColor: 'rgba(124,58,237,.3)' }} />
                </div>

                <div>
                  <label className={labelCls}>קטגוריה</label>
                  <select name="category" className={inputCls} style={{ borderColor: 'rgba(124,58,237,.3)' }}>
                    <option value="">ללא קטגוריה</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>תגיות (מופרדות בפסיקים)</label>
                  <input name="tags" placeholder="לוגו, פרינט, מינימליסטי..." className={inputCls} style={{ borderColor: 'rgba(124,58,237,.3)' }} />
                </div>

                <button
                  type="submit"
                  disabled={pending}
                  className="w-full rounded-xl py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
                >
                  {pending ? 'מעלה...' : 'העלה עיצוב'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function PostCard({ post, currentUserId, onDelete, isPending }: {
  post: InspirationPost
  currentUserId: string
  onDelete: (id: string) => void
  isPending: boolean
}) {
  const author = post.profiles
  const displayName = author?.full_name ?? author?.username ?? 'גרפיקאי'

  return (
    <Link
      href={`/inspiration/${post.id}`}
      className="group block overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
      style={{ background: 'var(--s2)', border: '1px solid var(--bd)', boxShadow: '0 2px 8px rgba(0,0,0,.2)' }}
    >
      <div className="relative overflow-hidden" style={{ aspectRatio: '4/3' }}>
        <img
          src={post.image_url}
          alt={post.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {post.category && (
          <span
            className="absolute start-3 top-3 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white backdrop-blur-sm"
            style={{ background: 'rgba(124,58,237,.75)' }}
          >
            {post.category}
          </span>
        )}
        {post.user_id === currentUserId && (
          <button
            onClick={(e) => {
              e.preventDefault()
              if (confirm('למחוק עיצוב זה?')) onDelete(post.id)
            }}
            disabled={isPending}
            className="absolute end-2 top-2 rounded-lg p-1.5 opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-50"
            style={{ background: 'rgba(0,0,0,.6)' }}
          >
            <Trash2 size={13} className="text-white" />
          </button>
        )}
      </div>

      <div className="p-4">
        <h3 className="mb-2.5 font-bold text-slate-100 line-clamp-1 group-hover:text-purple-300 transition-colors">{post.title}</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}
            >
              {displayName[0].toUpperCase()}
            </div>
            <span className="text-xs text-slate-400">{displayName}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <MessageSquare size={12} />
            {post.comment_count ?? 0}
          </div>
        </div>
        {post.tags && post.tags.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {post.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full px-2 py-0.5 text-[10px] text-slate-500"
                style={{ background: 'var(--inp)', border: '1px solid var(--bd)' }}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}

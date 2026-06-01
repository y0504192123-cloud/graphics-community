'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Upload, MessageSquare, X, ImageIcon, Plus, Trash2 } from 'lucide-react'
import type { InspirationPost } from '@/types'

async function compressImage(file: File, maxMB = 3.5): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      // Scale down if either dimension exceeds 2500px
      const MAX_DIM = 2500
      let { width, height } = img
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width >= height) { height = Math.round(height * MAX_DIM / width); width = MAX_DIM }
        else                 { width = Math.round(width  * MAX_DIM / height); height = MAX_DIM }
      }

      const canvas = document.createElement('canvas')
      canvas.width  = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)

      const maxBytes   = maxMB * 1024 * 1024
      const qualities  = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4]

      const tryQuality = (i: number) => {
        const q = qualities[i] ?? 0.35
        canvas.toBlob((blob) => {
          if (!blob) { reject(new Error('Canvas toBlob failed')); return }
          console.log(`[compress] quality=${q} → ${(blob.size / 1024 / 1024).toFixed(2)}MB`)

          if (blob.size <= maxBytes || i >= qualities.length - 1) {
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
              type: 'image/jpeg',
              lastModified: Date.now(),
            }))
          } else {
            tryQuality(i + 1)
          }
        }, 'image/jpeg', q)
      }

      tryQuality(0)
    }

    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Image load failed')) }
    img.src = objectUrl
  })
}

const inputCls = 'w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-purple-500/20'
const labelCls = 'mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-500'

type Props = {
  posts: InspirationPost[]
  currentUserId: string
  categories: string[]
  createPost: (prev: { error?: string } | null, fd: FormData) => Promise<{ error?: string } | null>
  deletePost: (id: string) => Promise<void>
  getSignedUploadUrl: () => Promise<{ signedUrl?: string; token?: string; path?: string; publicUrl?: string; error?: string }>
}

export default function InspirationClient({ posts, currentUserId, categories, createPost, deletePost, getSignedUploadUrl }: Props) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  const closeModal = () => {
    setShowModal(false)
    setPreview(null)
    setUploadError(null)
    formRef.current?.reset()
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setUploading(true)
    setUploadError(null)

    const fd = new FormData(e.currentTarget)
    const rawFile = fd.get('image') as File

    console.log('[handleSubmit] file:', rawFile?.name ?? 'null', 'size:', rawFile?.size ?? 0)

    if (!rawFile || rawFile.size === 0) {
      setUploadError('נא לבחור תמונה')
      setUploading(false)
      return
    }

    // Step 1: compress image client-side
    let file: File
    try {
      setUploadStatus('מכווץ תמונה...')
      file = await compressImage(rawFile)
      console.log('[handleSubmit] compressed:', (file.size / 1024 / 1024).toFixed(2), 'MB')
    } catch (err) {
      console.error('[handleSubmit] compression failed:', err)
      setUploadError('שגיאה בעיבוד התמונה: ' + String(err))
      setUploading(false)
      return
    }

    // Step 2: get signed URL from server (tiny request, no file through Vercel)
    setUploadStatus('מעלה תמונה...')
    const urlResult = await getSignedUploadUrl()
    console.log('[handleSubmit] getSignedUploadUrl result:', urlResult.error ?? 'ok')
    if (urlResult.error || !urlResult.signedUrl) {
      setUploadError(urlResult.error ?? 'שגיאה בקבלת URL להעלאה')
      setUploading(false)
      return
    }

    // Upload directly to Supabase Storage via signed URL (bypasses Vercel body limit)
    try {
      const uploadRes = await fetch(urlResult.signedUrl!, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/jpeg' },
        body: file,
      })
      if (!uploadRes.ok) {
        const errText = await uploadRes.text().catch(() => '')
        console.error('[handleSubmit] PUT failed:', uploadRes.status, errText)
        setUploadError(`שגיאת העלאה (${uploadRes.status}): ${errText.slice(0, 200) || 'שגיאה לא ידועה'}`)
        setUploading(false)
        return
      }
      console.log('[handleSubmit] PUT success:', uploadRes.status)
    } catch (err) {
      console.error('[handleSubmit] PUT threw:', err)
      setUploadError(`שגיאת העלאה: ${String(err)}`)
      setUploading(false)
      return
    }
    const imageUrl = urlResult.publicUrl!

    // Step 3: save post record via server action
    setUploadStatus('שומר...')
    const postFd = new FormData()
    postFd.set('image_url', imageUrl)
    postFd.set('title', (fd.get('title') as string) || '')
    postFd.set('description', (fd.get('description') as string) || '')
    postFd.set('category', (fd.get('category') as string) || '')
    postFd.set('tags', (fd.get('tags') as string) || '')

    console.log('[handleSubmit] calling createPost server action')
    try {
      const result = await createPost(null, postFd)
      console.log('[handleSubmit] createPost result:', result)
      if (result?.error) {
        setUploadError(result.error)
      } else {
        closeModal()
        window.location.reload()
      }
    } catch (err) {
      console.error('[handleSubmit] createPost threw:', err)
      setUploadError('שגיאה בשמירת הפוסט: ' + String(err))
    }

    setUploading(false)
    setUploadStatus('')
  }

  return (
    <div className="min-h-full" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <div
        className="relative overflow-hidden px-6 py-8"
        style={{ background: 'var(--hero)' }}
      >
        <div className="pointer-events-none absolute -top-20 end-0 h-60 w-60 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, rgba(124,58,237,.6) 0%, transparent 70%)', filter: 'blur(50px)' }} />
        <div className="grid-pattern absolute inset-0 opacity-40" />
        <div className="relative mx-auto max-w-6xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--tx)' }}>ספריית השראה</h1>
              <p className="mt-0.5 text-sm" style={{ color: 'var(--tx2)' }}>עיצובים מהקהילה — שתפו, העירו, התעוררו</p>
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
            <p className="font-semibold" style={{ color: 'var(--tx)' }}>אין עיצובים עדיין</p>
            <p className="text-sm" style={{ color: 'var(--tx2)' }}>היו הראשונים לשתף עיצוב בקהילה!</p>
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
              <h2 className="text-lg font-bold" style={{ color: 'var(--tx)' }}>העלאת עיצוב</h2>
              <button onClick={closeModal} className="rounded-lg p-1 transition" style={{ color: 'var(--tx3)' }}>
                <X size={20} />
              </button>
            </div>

            <form ref={formRef} onSubmit={handleSubmit} className="max-h-[80vh] overflow-y-auto p-6">
              <div className="space-y-4">
                {uploadError && (
                  <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{uploadError}</p>
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
                        <span className="text-sm" style={{ color: 'var(--tx2)' }}>לחץ לבחירת תמונה</span>
                        <span className="text-xs" style={{ color: 'var(--tx3)' }}>JPG, PNG, WebP — עד 10MB</span>
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
                  <input
                    name="title"
                    required
                    className={inputCls}
                    style={{ borderColor: 'rgba(124,58,237,.3)', background: 'var(--inp)', color: 'var(--tx)' }}
                  />
                </div>

                <div>
                  <label className={labelCls}>תיאור</label>
                  <textarea
                    name="description"
                    rows={2}
                    className={`${inputCls} resize-none`}
                    style={{ borderColor: 'rgba(124,58,237,.3)', background: 'var(--inp)', color: 'var(--tx)' }}
                  />
                </div>

                <div>
                  <label className={labelCls}>קטגוריה</label>
                  <select
                    name="category"
                    className={inputCls}
                    style={{ borderColor: 'rgba(124,58,237,.3)', background: 'var(--s2)', color: 'var(--tx)' }}
                  >
                    <option value="" style={{ background: 'var(--s1)', color: 'var(--tx)' }}>ללא קטגוריה</option>
                    {categories.map((c) => (
                      <option key={c} value={c} style={{ background: 'var(--s1)', color: 'var(--tx)' }}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>תגיות (מופרדות בפסיקים)</label>
                  <input
                    name="tags"
                    className={inputCls}
                    style={{ borderColor: 'rgba(124,58,237,.3)', background: 'var(--inp)', color: 'var(--tx)' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={uploading}
                  className="w-full rounded-xl py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
                >
                  {uploading ? uploadStatus || 'מעלה...' : 'העלה עיצוב'}
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
      className="group block overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1"
      style={{ background: 'var(--s2)', border: '1px solid var(--bd)', boxShadow: '0 2px 8px rgba(0,0,0,.15)' }}
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
        <h3
          className="mb-2.5 font-bold line-clamp-1 transition-colors group-hover:text-purple-400"
          style={{ color: 'var(--tx)' }}
        >
          {post.title}
        </h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}
            >
              {displayName[0].toUpperCase()}
            </div>
            <span className="text-xs" style={{ color: 'var(--tx2)' }}>{displayName}</span>
          </div>
          <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--tx3)' }}>
            <MessageSquare size={12} />
            {post.comment_count ?? 0}
          </div>
        </div>
        {post.tags && post.tags.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {post.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full px-2 py-0.5 text-[10px]"
                style={{ background: 'var(--inp)', border: '1px solid var(--bd)', color: 'var(--tx3)' }}
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

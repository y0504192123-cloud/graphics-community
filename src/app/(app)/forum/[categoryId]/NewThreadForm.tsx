'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { ImageIcon, X } from 'lucide-react'
import { createThread, getForumImageUploadUrl } from '../actions'

export default function NewThreadForm({ categoryId }: { categoryId: string }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'))
    const file = item?.getAsFile()
    if (file) handleImageFile(file)
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim() || isSubmitting) return
    setIsSubmitting(true)
    try {
      let imageUrl: string | undefined
      if (imageFile) {
        const { signedUrl, publicUrl, error } = await getForumImageUploadUrl()
        if (!error && signedUrl && publicUrl) {
          await fetch(signedUrl, { method: 'PUT', body: imageFile, headers: { 'Content-Type': imageFile.type } })
          imageUrl = publicUrl
        }
      }
      await createThread(categoryId, title, content, imageUrl)
    } catch {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: 'var(--s1)', border: '1px solid rgba(124,58,237,.2)', boxShadow: '0 4px 20px rgba(124,58,237,.08)' }}
      onPaste={handlePaste}
    >
      <h2 className="mb-4 text-base font-bold" style={{ color: 'var(--tx)' }}>פתח נושא חדש</h2>
      <div className="space-y-3">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="כותרת הנושא"
          className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition placeholder:text-slate-400"
          style={{ background: 'var(--inp)', border: '1px solid var(--bd)', color: 'var(--tx)' }}
        />
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); handleSubmit() } }}
          rows={5}
          placeholder="תוכן הנושא... שאל שאלה, שתף ידע, פתח דיון (Ctrl+Enter לשליחה)"
          className="w-full resize-none rounded-xl px-4 py-2.5 text-sm outline-none transition placeholder:text-slate-400"
          style={{ background: 'var(--inp)', border: '1px solid var(--bd)', color: 'var(--tx)' }}
        />

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition hover:opacity-80"
            style={{ background: 'var(--inp)', border: '1px solid var(--bd)', color: 'var(--tx3)' }}
          >
            <ImageIcon size={13} />
            הוסף תמונה
          </button>
          <span className="text-xs" style={{ color: 'var(--tx3)' }}>או הדבק תמונה (Ctrl+V)</span>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f) }}
          />
        </div>

        {imagePreview && (
          <div className="relative inline-block">
            <img
              src={imagePreview}
              alt=""
              style={{ maxWidth: '100%', maxHeight: '220px', height: 'auto', borderRadius: '12px', display: 'block' }}
            />
            <button
              onClick={removeImage}
              className="absolute end-2 top-2 rounded-full p-1 transition hover:opacity-80"
              style={{ background: 'rgba(0,0,0,.65)', color: 'white' }}
            >
              <X size={12} />
            </button>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || !content.trim() || isSubmitting}
            className="rounded-xl px-5 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}
          >
            {isSubmitting ? 'פורסם...' : 'פרסם נושא'}
          </button>
          <Link
            href={`/forum/${categoryId}`}
            className="rounded-xl px-4 py-2 text-sm font-medium transition hover:opacity-80"
            style={{ color: 'var(--tx3)', border: '1px solid var(--bd)' }}
          >
            ביטול
          </Link>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { ImageIcon, X } from 'lucide-react'
import { createThread, getForumImageUploadUrl } from '../actions'

function parseImageUrls(raw?: string | null): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [raw]
  } catch {
    return [raw]
  }
}

export default function NewThreadForm({ categoryId }: { categoryId: string }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const addImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) return
    setImageFiles(prev => [...prev, file])
    setImagePreviews(prev => [...prev, URL.createObjectURL(file)])
  }

  const removeImage = (idx: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== idx))
    setImagePreviews(prev => prev.filter((_, i) => i !== idx))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files ?? []).forEach(addImageFile)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    Array.from(e.clipboardData.items)
      .filter(i => i.type.startsWith('image/'))
      .forEach(i => { const f = i.getAsFile(); if (f) addImageFile(f) })
  }

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim() || isSubmitting) return
    setIsSubmitting(true)
    try {
      let imageUrl: string | undefined
      if (imageFiles.length > 0) {
        const urls: string[] = []
        for (const file of imageFiles) {
          const { signedUrl, publicUrl, error } = await getForumImageUploadUrl()
          if (!error && signedUrl && publicUrl) {
            await fetch(signedUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
            urls.push(publicUrl)
          }
        }
        if (urls.length > 0) imageUrl = urls.length === 1 ? urls[0] : JSON.stringify(urls)
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
            הוסף תמונות
          </button>
          <span className="text-xs" style={{ color: 'var(--tx3)' }}>או הדבק תמונות (Ctrl+V)</span>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
        </div>

        {imagePreviews.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {imagePreviews.map((src, idx) => (
              <div key={idx} className="relative">
                <img
                  src={src}
                  alt=""
                  style={{ width: '90px', height: '90px', objectFit: 'cover', borderRadius: '10px', display: 'block' }}
                />
                <button
                  onClick={() => removeImage(idx)}
                  className="absolute -end-1.5 -top-1.5 rounded-full p-0.5 transition hover:opacity-80"
                  style={{ background: 'rgba(0,0,0,.7)', color: 'white' }}
                >
                  <X size={11} />
                </button>
              </div>
            ))}
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

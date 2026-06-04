'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { ImageIcon, X, Bold, Italic, List, Quote } from 'lucide-react'
import { createThread, getForumImageUploadUrl } from '../actions'

export default function NewThreadForm({ categoryId }: { categoryId: string }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

  const insertFormat = (prefix: string, suffix = prefix, placeholder = 'טקסט') => {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = content.slice(start, end)
    const ins = selected ? `${prefix}${selected}${suffix}` : `${prefix}${placeholder}${suffix}`
    const next = content.slice(0, start) + ins + content.slice(end)
    setContent(next)
    requestAnimationFrame(() => {
      el.focus()
      const newStart = selected ? start + ins.length : start + prefix.length
      const newEnd = selected ? start + ins.length : start + prefix.length + placeholder.length
      el.setSelectionRange(newStart, newEnd)
    })
  }

  const insertLinePrefix = (prefix: string) => {
    const el = textareaRef.current
    if (!el) return
    const pos = el.selectionStart
    const lineStart = content.lastIndexOf('\n', pos - 1) + 1
    const next = content.slice(0, lineStart) + prefix + content.slice(lineStart)
    setContent(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(pos + prefix.length, pos + prefix.length)
    })
  }

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim() || isSubmitting) return
    setIsSubmitting(true)
    try {
      const urls: string[] = []
      for (const file of imageFiles) {
        const { signedUrl, publicUrl, error } = await getForumImageUploadUrl()
        if (!error && signedUrl && publicUrl) {
          await fetch(signedUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
          urls.push(publicUrl)
        }
      }
      await createThread(categoryId, title, content, urls.length > 0 ? urls : undefined)
    } catch {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="overflow-hidden rounded-2xl"
      style={{ background: 'var(--s1)', border: '1px solid rgba(124,58,237,.25)', boxShadow: '0 4px 24px rgba(124,58,237,.08)' }}
      onPaste={handlePaste}
    >
      <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--bd)', background: 'linear-gradient(to left,rgba(124,58,237,.04),transparent)' }}>
        <h2 className="text-base font-bold" style={{ color: 'var(--tx)' }}>פתח נושא חדש</h2>
      </div>
      <div className="p-5 space-y-3">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="כותרת הנושא"
          className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold outline-none transition placeholder:font-normal placeholder:text-slate-400"
          style={{ background: 'var(--inp)', border: '1px solid var(--bd)', color: 'var(--tx)' }}
        />

        {/* Toolbar */}
        <div className="flex items-center gap-1 rounded-xl px-2 py-1.5" style={{ background: 'var(--inp)', border: '1px solid var(--bd)' }}>
          <button type="button" onClick={() => insertFormat('**', '**', 'טקסט מודגש')}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-purple-100 hover:text-purple-600" title="מודגש"
            style={{ color: 'var(--tx3)' }}>
            <Bold size={13} strokeWidth={2.5} />
          </button>
          <button type="button" onClick={() => insertFormat('*', '*', 'טקסט נטוי')}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-purple-100 hover:text-purple-600" title="נטוי"
            style={{ color: 'var(--tx3)' }}>
            <Italic size={13} />
          </button>
          <div className="mx-1 h-4 w-px" style={{ background: 'var(--bd)' }} />
          <button type="button" onClick={() => insertLinePrefix('- ')}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-purple-100 hover:text-purple-600" title="רשימה"
            style={{ color: 'var(--tx3)' }}>
            <List size={13} />
          </button>
          <button type="button" onClick={() => insertLinePrefix('> ')}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-purple-100 hover:text-purple-600" title="ציטוט"
            style={{ color: 'var(--tx3)' }}>
            <Quote size={13} />
          </button>
          <div className="mx-1 h-4 w-px" style={{ background: 'var(--bd)' }} />
          <button type="button" onClick={() => fileRef.current?.click()}
            className="flex h-7 items-center gap-1.5 rounded-lg px-2 text-xs transition hover:bg-purple-100 hover:text-purple-600" title="הוסף תמונות"
            style={{ color: 'var(--tx3)' }}>
            <ImageIcon size={12} />
            <span>תמונות</span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
          <span className="ms-auto text-[10px]" style={{ color: 'var(--tx3)' }}>Ctrl+Enter לשליחה</span>
        </div>

        <textarea
          ref={textareaRef}
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); handleSubmit() } }}
          rows={6}
          placeholder="תוכן הנושא... שאל שאלה, שתף ידע, פתח דיון&#10;&#10;**מודגש** · *נטוי* · - רשימה · > ציטוט"
          className="w-full resize-none rounded-xl px-4 py-3 text-sm outline-none transition placeholder:text-slate-400"
          style={{ background: 'var(--inp)', border: '1px solid var(--bd)', color: 'var(--tx)', lineHeight: '1.7' }}
        />

        {imagePreviews.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {imagePreviews.map((src, idx) => (
              <div key={idx} className="relative group/img">
                <img src={src} alt="" style={{ width: '84px', height: '84px', objectFit: 'cover', borderRadius: '10px', display: 'block' }} />
                <button
                  onClick={() => removeImage(idx)}
                  className="absolute -end-1.5 -top-1.5 rounded-full p-0.5 opacity-0 group-hover/img:opacity-100 transition"
                  style={{ background: 'rgba(0,0,0,.75)', color: 'white' }}
                >
                  <X size={11} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex h-[84px] w-[84px] items-center justify-center rounded-[10px] transition hover:bg-purple-50 hover:border-purple-300"
              style={{ border: '2px dashed var(--bd)' }}
            >
              <ImageIcon size={18} style={{ color: 'var(--tx3)' }} />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || !content.trim() || isSubmitting}
            className="rounded-xl px-6 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', boxShadow: '0 4px 14px rgba(124,58,237,.3)' }}
          >
            {isSubmitting ? 'מפרסם...' : 'פרסם נושא'}
          </button>
          <Link
            href={`/forum/${categoryId}`}
            className="rounded-xl px-4 py-2.5 text-sm font-medium transition hover:opacity-80"
            style={{ color: 'var(--tx3)', border: '1px solid var(--bd)' }}
          >
            ביטול
          </Link>
          <span className="ms-auto text-xs" style={{ color: 'var(--tx3)' }}>
            {imagePreviews.length > 0 ? `${imagePreviews.length} תמונות` : 'Ctrl+V להדבקת תמונה'}
          </span>
        </div>
      </div>
    </div>
  )
}

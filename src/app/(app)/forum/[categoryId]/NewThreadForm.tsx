'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ImageIcon, X, Bold, Italic, List, Quote, Tag, AlertCircle, Mail } from 'lucide-react'
import { createThread, getForumImageUploadUrl, sendChallengeEmailToAll } from '../actions'

function TagsInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState('')
  const addTag = () => {
    const t = input.trim().replace(/^#/, '').slice(0, 30)
    if (t && !tags.includes(t) && tags.length < 8) onChange([...tags, t])
    setInput('')
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-xl px-3 py-2 min-h-[40px]"
      style={{ background: 'var(--inp)', border: '1px solid var(--bd)' }}>
      <Tag size={12} style={{ color: 'var(--tx3)' }} className="shrink-0" />
      {tags.map(t => (
        <span key={t} className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
          style={{ background: 'rgba(124,58,237,.1)', color: '#7c3aed', border: '1px solid rgba(124,58,237,.2)' }}>
          #{t}
          <button type="button" onClick={() => onChange(tags.filter(x => x !== t))} className="hover:text-red-500 transition">
            <X size={9} />
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() }
          if (e.key === 'Backspace' && !input && tags.length) onChange(tags.slice(0, -1))
        }}
        onBlur={addTag}
        placeholder={tags.length === 0 ? 'תגיות... (Enter לאישור, עד 8)' : ''}
        className="flex-1 min-w-[80px] bg-transparent text-xs outline-none placeholder:text-slate-400"
        style={{ color: 'var(--tx)' }}
      />
    </div>
  )
}

const DRAFT_PREFIX = 'forumNewThreadDraft_'

export default function NewThreadForm({ categoryId, isAdminOnly }: { categoryId: string; isAdminOnly?: boolean }) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [sendEmail, setSendEmail] = useState(false)
  const [emailStatus, setEmailStatus] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Restore draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_PREFIX + categoryId)
      if (saved) {
        const d = JSON.parse(saved)
        if (d.title) setTitle(d.title)
        if (d.content) setContent(d.content)
        if (Array.isArray(d.tags)) setTags(d.tags)
      }
    } catch {}
  }, [categoryId])

  // Save draft on change
  useEffect(() => {
    if (!title && !content) return
    try { localStorage.setItem(DRAFT_PREFIX + categoryId, JSON.stringify({ title, content, tags })) } catch {}
  }, [title, content, tags, categoryId])

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
    const s = el.selectionStart, e2 = el.selectionEnd
    const sel = content.slice(s, e2)
    const ins = sel ? `${prefix}${sel}${suffix}` : `${prefix}${placeholder}${suffix}`
    setContent(content.slice(0, s) + ins + content.slice(e2))
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(sel ? s + ins.length : s + prefix.length, sel ? s + ins.length : s + prefix.length + placeholder.length)
    })
  }

  const insertLinePrefix = (prefix: string) => {
    const el = textareaRef.current
    if (!el) return
    const pos = el.selectionStart
    const lineStart = content.lastIndexOf('\n', pos - 1) + 1
    setContent(content.slice(0, lineStart) + prefix + content.slice(lineStart))
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(pos + prefix.length, pos + prefix.length) })
  }

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim() || isSubmitting) return
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const urls: string[] = []
      for (const file of imageFiles) {
        const { signedUrl, publicUrl, error } = await getForumImageUploadUrl()
        if (!error && signedUrl && publicUrl) {
          await fetch(signedUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
          urls.push(publicUrl)
        }
      }
      const result = await createThread(
        categoryId, title, content,
        urls.length > 0 ? urls : undefined,
        tags.length > 0 ? tags : undefined,
      )
      console.log('[createThread] result:', result, 'categoryId:', categoryId)
      if (result.error) {
        setSubmitError(result.error)
        setIsSubmitting(false)
      } else if (result.threadId) {
        try { localStorage.removeItem(DRAFT_PREFIX + categoryId) } catch {}
        if (sendEmail) {
          setEmailStatus('שולח מיילים לחברים...')
          const emailResult = await sendChallengeEmailToAll(result.threadId, categoryId)
          setEmailStatus(emailResult.error ? `שגיאה: ${emailResult.error}` : `נשלח ל-${emailResult.sent} חברים ✓`)
          await new Promise(r => setTimeout(r, 1800))
        }
        router.push(`/forum/${categoryId}/${result.threadId}`)
      }
    } catch { setIsSubmitting(false) }
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
          <button type="button" onClick={() => insertFormat('**', '**', 'מודגש')}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-purple-100 hover:text-purple-600"
            style={{ color: 'var(--tx3)' }}><Bold size={13} strokeWidth={2.5} /></button>
          <button type="button" onClick={() => insertFormat('*', '*', 'נטוי')}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-purple-100 hover:text-purple-600"
            style={{ color: 'var(--tx3)' }}><Italic size={13} /></button>
          <div className="mx-1 h-4 w-px" style={{ background: 'var(--bd)' }} />
          <button type="button" onClick={() => insertLinePrefix('- ')}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-purple-100 hover:text-purple-600"
            style={{ color: 'var(--tx3)' }}><List size={13} /></button>
          <button type="button" onClick={() => insertLinePrefix('> ')}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-purple-100 hover:text-purple-600"
            style={{ color: 'var(--tx3)' }}><Quote size={13} /></button>
          <div className="mx-1 h-4 w-px" style={{ background: 'var(--bd)' }} />
          <button type="button" onClick={() => fileRef.current?.click()}
            className="flex h-7 items-center gap-1.5 rounded-lg px-2 text-xs transition hover:bg-purple-100 hover:text-purple-600"
            style={{ color: 'var(--tx3)' }}>
            <ImageIcon size={12} /><span>תמונות</span>
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
          placeholder={'תוכן הנושא...\n\n**מודגש** · *נטוי* · - רשימה · > ציטוט'}
          className="w-full resize-none rounded-xl px-4 py-3 text-sm outline-none transition placeholder:text-slate-400"
          style={{ background: 'var(--inp)', border: '1px solid var(--bd)', color: 'var(--tx)', lineHeight: '1.7' }}
        />

        <TagsInput tags={tags} onChange={setTags} />

        {imagePreviews.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {imagePreviews.map((src, idx) => (
              <div key={idx} className="relative group/img">
                <img src={src} alt="" style={{ width: '84px', height: '84px', objectFit: 'cover', borderRadius: '10px', display: 'block' }} />
                <button onClick={() => removeImage(idx)}
                  className="absolute -end-1.5 -top-1.5 rounded-full p-0.5 opacity-0 group-hover/img:opacity-100 transition"
                  style={{ background: 'rgba(0,0,0,.75)', color: 'white' }}>
                  <X size={11} />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => fileRef.current?.click()}
              className="flex h-[84px] w-[84px] items-center justify-center rounded-[10px] transition hover:border-purple-300"
              style={{ border: '2px dashed var(--bd)' }}>
              <ImageIcon size={18} style={{ color: 'var(--tx3)' }} />
            </button>
          </div>
        )}

        {isAdminOnly && (
          <label className="flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3 transition"
            style={{ background: 'rgba(217,119,6,.06)', border: '1px solid rgba(217,119,6,.2)' }}>
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={e => setSendEmail(e.target.checked)}
              className="h-4 w-4 cursor-pointer rounded accent-amber-600"
            />
            <Mail size={14} style={{ color: '#b45309' }} />
            <span className="text-sm font-semibold" style={{ color: '#92400e' }}>שלח מייל לכל החברים על האתגר החדש</span>
          </label>
        )}

        {submitError && (
          <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs"
            style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', color: '#ef4444' }}>
            <AlertCircle size={13} /> {submitError}
          </div>
        )}

        {emailStatus && (
          <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold"
            style={{ background: 'rgba(217,119,6,.08)', border: '1px solid rgba(217,119,6,.2)', color: '#b45309' }}>
            <Mail size={13} /> {emailStatus}
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || !content.trim() || isSubmitting}
            className="rounded-xl px-6 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', boxShadow: '0 4px 14px rgba(124,58,237,.3)' }}
          >
            {isSubmitting ? (emailStatus ? emailStatus : 'מפרסם...') : 'פרסם נושא'}
          </button>
          <Link href={`/forum/${categoryId}`}
            className="rounded-xl px-4 py-2.5 text-sm font-medium transition hover:opacity-80"
            style={{ color: 'var(--tx3)', border: '1px solid var(--bd)' }}>
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

'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Heart, Trash2, Edit2, CornerUpLeft, CheckCircle2, ChevronLeft,
  ImageIcon, X, Bold, Italic, List, Quote, ZoomIn, ChevronRight,
} from 'lucide-react'
import type { ForumThread, ForumReply, Profile } from '@/types'
import ReportButton from '@/components/ReportButton'
import {
  createReply, editReply, deleteReply, deleteThread,
  toggleLike, markBestAnswer, getForumImageUploadUrl,
} from '../../actions'

// ── Helpers ───────────────────────────────────────────────

function fmtDate(iso: string) {
  const d = new Date(iso)
  const diffMs = Date.now() - d.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'עכשיו'
  if (mins < 60) return `לפני ${mins} דק׳`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `לפני ${hrs} שע׳`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `לפני ${days} ימים`
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })
}

function dName(p?: Profile | null) { return p?.full_name ?? p?.username ?? 'משתמש' }
function initials(name: string) { return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() }

const GRADS = ['from-violet-500 to-purple-700', 'from-pink-500 to-rose-700', 'from-blue-500 to-indigo-700', 'from-emerald-500 to-teal-700']
function grad(uid: string) {
  let h = 0; for (let i = 0; i < uid.length; i++) h = (Math.imul(31, h) + uid.charCodeAt(i)) | 0
  return GRADS[Math.abs(h) % GRADS.length]
}

function getImages(obj: { images?: string[] | null; image_url?: string | null }): string[] {
  if (obj.images?.length) return obj.images
  if (!obj.image_url) return []
  try {
    const p = JSON.parse(obj.image_url)
    return Array.isArray(p) ? p.filter(Boolean) : [obj.image_url]
  } catch { return [obj.image_url] }
}

// ── Rich text renderer ────────────────────────────────────

type InlineNode = string | { type: 'bold' | 'italic' | 'code'; text: string }

function parseInline(text: string): InlineNode[] {
  const result: InlineNode[] = []
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g
  let last = 0; let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) result.push(text.slice(last, m.index))
    if (m[2]) result.push({ type: 'bold', text: m[2] })
    else if (m[3]) result.push({ type: 'italic', text: m[3] })
    else if (m[4]) result.push({ type: 'code', text: m[4] })
    last = re.lastIndex
  }
  if (last < text.length) result.push(text.slice(last))
  return result
}

function InlineContent({ nodes }: { nodes: InlineNode[] }) {
  return (
    <>
      {nodes.map((n, i) => {
        if (typeof n === 'string') return <span key={i}>{n}</span>
        if (n.type === 'bold') return <strong key={i} className="font-bold">{n.text}</strong>
        if (n.type === 'italic') return <em key={i}>{n.text}</em>
        return <code key={i} className="rounded px-1 py-0.5 text-[12px] font-mono" style={{ background: 'rgba(124,58,237,.1)', color: '#7c3aed' }}>{n.text}</code>
      })}
    </>
  )
}

function RichContent({ content }: { content: string }) {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let listItems: string[] = []

  const flushList = (key: number) => {
    if (!listItems.length) return
    elements.push(
      <ul key={`ul-${key}`} className="my-1.5 space-y-0.5 ps-5" style={{ listStyleType: 'disc' }}>
        {listItems.map((item, i) => (
          <li key={i} className="text-sm leading-relaxed" style={{ color: 'var(--tx)' }}>
            <InlineContent nodes={parseInline(item)} />
          </li>
        ))}
      </ul>
    )
    listItems = []
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith('> ')) {
      flushList(i)
      elements.push(
        <div key={i} className="my-1.5 rounded-lg border-s-[3px] border-purple-400 px-3 py-2 text-sm"
          style={{ background: 'rgba(124,58,237,.05)', color: 'var(--tx2)', fontStyle: 'italic' }}>
          <InlineContent nodes={parseInline(line.slice(2))} />
        </div>
      )
    } else if (line.startsWith('- ') || line.startsWith('• ')) {
      listItems.push(line.slice(2))
    } else {
      flushList(i)
      if (line === '') {
        elements.push(<div key={i} className="h-1.5" />)
      } else {
        elements.push(
          <p key={i} className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--tx)' }}>
            <InlineContent nodes={parseInline(line)} />
          </p>
        )
      }
    }
  }
  flushList(lines.length)
  return <div className="space-y-0.5">{elements}</div>
}

// ── Lightbox ──────────────────────────────────────────────

function Lightbox({ images, startIdx, onClose }: { images: string[]; startIdx: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIdx)
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') setIdx(i => (i - 1 + images.length) % images.length)
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') setIdx(i => (i + 1) % images.length)
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [images.length, onClose])

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,.92)', backdropFilter: 'blur(10px)' }}
      onClick={onClose}
    >
      <button onClick={onClose} className="absolute end-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-white/10" style={{ color: 'white' }}>
        <X size={20} />
      </button>
      <div onClick={e => e.stopPropagation()} className="flex flex-col items-center gap-4 px-4">
        <img
          src={images[idx]}
          alt=""
          style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 24px 80px rgba(0,0,0,.6)' }}
        />
        {images.length > 1 && (
          <div className="flex items-center gap-4">
            <button onClick={() => setIdx(i => (i - 1 + images.length) % images.length)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:bg-white/15">
              <ChevronRight size={18} />
            </button>
            <span className="text-sm text-white/70 min-w-[50px] text-center">{idx + 1} / {images.length}</span>
            <button onClick={() => setIdx(i => (i + 1) % images.length)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:bg-white/15">
              <ChevronLeft size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Image Grid ────────────────────────────────────────────

function ImageGrid({ images }: { images: string[] }) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  if (!images.length) return null
  const cols = images.length === 1 ? 1 : images.length === 2 ? 2 : images.length === 3 ? 3 : 2
  return (
    <>
      <div className="mt-3 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, maxWidth: images.length === 1 ? '100%' : '420px' }}>
        {images.map((url, i) => (
          <div key={i} className="group/img relative cursor-zoom-in overflow-hidden rounded-xl" onClick={() => setLightboxIdx(i)}>
            <img
              src={url}
              alt=""
              style={{
                width: '100%',
                aspectRatio: images.length === 1 ? 'auto' : '1',
                maxHeight: images.length === 1 ? '400px' : undefined,
                objectFit: images.length === 1 ? 'contain' : 'cover',
                display: 'block',
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center rounded-xl opacity-0 transition group-hover/img:opacity-100" style={{ background: 'rgba(0,0,0,.25)' }}>
              <ZoomIn size={22} className="text-white drop-shadow-md" />
            </div>
          </div>
        ))}
      </div>
      {lightboxIdx !== null && (
        <Lightbox images={images} startIdx={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}
    </>
  )
}

// ── Avatar ────────────────────────────────────────────────

function Avatar({ profile, uid, size = 10 }: { profile?: Profile | null; uid: string; size?: number }) {
  const sz = `h-${size} w-${size}`
  return (
    <div className={`${sz} shrink-0 overflow-hidden rounded-full bg-gradient-to-br ${grad(uid)} flex items-center justify-center text-xs font-bold text-white`}>
      {profile?.avatar_url
        ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
        : <span style={{ fontSize: size <= 8 ? '10px' : '12px' }}>{initials(dName(profile))}</span>
      }
    </div>
  )
}

// ── Reply Editor ──────────────────────────────────────────

type EditorProps = {
  value: string
  onChange: (v: string) => void
  quotedText: string
  onClearQuote: () => void
  imageFiles: File[]
  imagePreviews: string[]
  onAddImage: (f: File) => void
  onRemoveImage: (i: number) => void
  onSubmit: () => void
  isSubmitting: boolean
  fileRef: React.RefObject<HTMLInputElement | null>
}

function ReplyEditor({ value, onChange, quotedText, onClearQuote, imageFiles, imagePreviews, onAddImage, onRemoveImage, onSubmit, isSubmitting, fileRef }: EditorProps) {
  const taRef = useRef<HTMLTextAreaElement>(null)

  const insertFormat = (prefix: string, suffix = prefix, placeholder = 'טקסט') => {
    const el = taRef.current; if (!el) return
    const s = el.selectionStart, e2 = el.selectionEnd
    const sel = value.slice(s, e2)
    const ins = sel ? `${prefix}${sel}${suffix}` : `${prefix}${placeholder}${suffix}`
    const next = value.slice(0, s) + ins + value.slice(e2)
    onChange(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(sel ? s + ins.length : s + prefix.length, sel ? s + ins.length : s + prefix.length + placeholder.length)
    })
  }

  const insertLinePrefix = (prefix: string) => {
    const el = taRef.current; if (!el) return
    const pos = el.selectionStart
    const lineStart = value.lastIndexOf('\n', pos - 1) + 1
    const next = value.slice(0, lineStart) + prefix + value.slice(lineStart)
    onChange(next)
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(pos + prefix.length, pos + prefix.length) })
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    Array.from(e.clipboardData.items)
      .filter(i => i.type.startsWith('image/'))
      .forEach(i => { const f = i.getAsFile(); if (f) onAddImage(f) })
  }

  const canSend = (value.trim() || quotedText || imageFiles.length > 0) && !isSubmitting

  return (
    <div className="overflow-hidden rounded-2xl" style={{ background: 'var(--s1)', border: '1px solid var(--bd)' }}>
      <div className="px-4 py-3 text-sm font-bold" style={{ borderBottom: '1px solid var(--bd)', color: 'var(--tx)', background: 'var(--inp)' }}>
        הוסף תגובה
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-0.5 border-b px-3 py-1.5" style={{ borderColor: 'var(--bd)', background: 'var(--inp)' }}>
        {[
          { icon: <Bold size={12} strokeWidth={2.5} />, action: () => insertFormat('**', '**', 'טקסט מודגש'), title: 'מודגש (B)' },
          { icon: <Italic size={12} />, action: () => insertFormat('*', '*', 'טקסט נטוי'), title: 'נטוי (I)' },
          { icon: <List size={12} />, action: () => insertLinePrefix('- '), title: 'רשימה' },
          { icon: <Quote size={12} />, action: () => insertLinePrefix('> '), title: 'ציטוט' },
        ].map((btn, i) => (
          <button
            key={i}
            type="button"
            onClick={btn.action}
            title={btn.title}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-purple-100 hover:text-purple-600"
            style={{ color: 'var(--tx3)' }}
          >
            {btn.icon}
          </button>
        ))}
        <div className="mx-1.5 h-4 w-px" style={{ background: 'var(--bd)' }} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex h-7 items-center gap-1.5 rounded-lg px-2 text-[11px] transition hover:bg-purple-100 hover:text-purple-600"
          style={{ color: 'var(--tx3)' }}
          title="הוסף תמונות"
        >
          <ImageIcon size={12} />
          <span>תמונות</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => { Array.from(e.target.files ?? []).forEach(onAddImage); if (fileRef.current) fileRef.current.value = '' }}
        />
        <span className="ms-auto text-[10px]" style={{ color: 'var(--tx3)' }}>Ctrl+Enter לשליחה · Ctrl+V תמונה</span>
      </div>

      <div className="p-4 space-y-3" onPaste={handlePaste}>
        {/* Quote preview */}
        {quotedText && (
          <div className="flex items-start gap-2 rounded-xl border-s-[3px] border-purple-400 px-3 py-2"
            style={{ background: 'rgba(124,58,237,.05)' }}>
            <CornerUpLeft size={13} className="mt-0.5 shrink-0 text-purple-500" />
            <p className="flex-1 truncate text-xs italic" style={{ color: 'var(--tx3)' }}>
              {quotedText.split('\n').find(l => l.startsWith('> **'))?.slice(4)?.split(':**')[0] ?? ''}
            </p>
            <button onClick={onClearQuote} className="shrink-0 rounded p-0.5 hover:bg-red-100" style={{ color: 'var(--tx3)' }}>
              <X size={12} />
            </button>
          </div>
        )}

        <textarea
          ref={taRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); if (canSend) onSubmit() } }}
          rows={5}
          placeholder="כתוב תגובה...&#10;&#10;**מודגש** · *נטוי* · - רשימה · > ציטוט"
          className="w-full resize-none rounded-xl px-4 py-3 text-sm outline-none transition placeholder:text-slate-400"
          style={{ background: 'var(--inp)', border: '1px solid var(--bd)', color: 'var(--tx)', lineHeight: '1.7' }}
        />

        {imagePreviews.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {imagePreviews.map((src, idx) => (
              <div key={idx} className="group/thumb relative">
                <img src={src} alt="" style={{ width: '72px', height: '72px', objectFit: 'cover', borderRadius: '10px', display: 'block' }} />
                <button
                  onClick={() => onRemoveImage(idx)}
                  className="absolute -end-1.5 -top-1.5 rounded-full p-0.5 opacity-0 group-hover/thumb:opacity-100 transition"
                  style={{ background: 'rgba(0,0,0,.75)', color: 'white' }}
                >
                  <X size={10} />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => fileRef.current?.click()}
              className="flex h-[72px] w-[72px] items-center justify-center rounded-[10px] transition hover:border-purple-300"
              style={{ border: '2px dashed var(--bd)' }}>
              <ImageIcon size={16} style={{ color: 'var(--tx3)' }} />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={onSubmit}
            disabled={!canSend}
            className="rounded-xl px-6 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', boxShadow: canSend ? '0 4px 14px rgba(124,58,237,.3)' : 'none' }}
          >
            {isSubmitting ? 'שולח...' : 'שלח תגובה'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────

type Props = {
  thread: ForumThread & { profiles?: Profile }
  replies: ForumReply[]
  currentUserId: string
  currentProfile: Profile | null
  isAdmin: boolean
  categoryId: string
  isThreadAuthor: boolean
}

// ── Main component ────────────────────────────────────────

export default function ThreadClient({ thread, replies: initialReplies, currentUserId, currentProfile, isAdmin, categoryId, isThreadAuthor }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [replies, setReplies] = useState(initialReplies)
  const [replyText, setReplyText] = useState('')
  const [quotedText, setQuotedText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [replyImages, setReplyImages] = useState<File[]>([])
  const [replyImagePreviews, setReplyImagePreviews] = useState<string[]>([])
  const replyFileRef = useRef<HTMLInputElement>(null)

  const refresh = () => { startTransition(() => { router.refresh() }) }

  const addReplyImage = (f: File) => {
    if (!f.type.startsWith('image/')) return
    setReplyImages(p => [...p, f])
    setReplyImagePreviews(p => [...p, URL.createObjectURL(f)])
  }
  const removeReplyImage = (i: number) => {
    setReplyImages(p => p.filter((_, j) => j !== i))
    setReplyImagePreviews(p => p.filter((_, j) => j !== i))
  }

  const handleReply = async () => {
    const full = quotedText ? `${quotedText}${replyText.trim()}` : replyText.trim()
    if (!full && replyImages.length === 0) return
    setIsSubmitting(true)
    try {
      const urls: string[] = []
      for (const file of replyImages) {
        const { signedUrl, publicUrl, error } = await getForumImageUploadUrl()
        if (!error && signedUrl && publicUrl) {
          await fetch(signedUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
          urls.push(publicUrl)
        }
      }
      await createReply(thread.id, categoryId, full || ' ', urls.length > 0 ? urls : undefined)
      setReplyText(''); setQuotedText('')
      setReplyImages([]); setReplyImagePreviews([])
      if (replyFileRef.current) replyFileRef.current.value = ''
      refresh()
    } finally { setIsSubmitting(false) }
  }

  const handleQuote = (reply: ForumReply) => {
    const author = dName(reply.profiles)
    const firstLine = (reply.content.split('\n').find(l => !l.startsWith('> ')) ?? '').slice(0, 120)
    setQuotedText(`> **${author}:**\n> ${firstLine}\n\n`)
    document.getElementById('reply-form')?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleLike = async (replyId: string) => {
    setReplies(prev => prev.map(r => r.id === replyId
      ? { ...r, user_liked: !r.user_liked, like_count: (r.like_count ?? 0) + (r.user_liked ? -1 : 1) }
      : r
    ))
    await toggleLike(replyId, thread.id, categoryId)
  }

  const handleBestAnswer = async (replyId: string) => {
    await markBestAnswer(replyId, thread.id, categoryId)
    refresh()
  }

  const handleEditSave = async (replyId: string) => {
    if (!editText.trim()) return
    await editReply(replyId, thread.id, categoryId, editText)
    setEditingId(null); refresh()
  }

  const handleDeleteReply = async (replyId: string) => {
    if (!confirm('למחוק את התגובה?')) return
    await deleteReply(replyId, thread.id, categoryId)
    setReplies(prev => prev.filter(r => r.id !== replyId))
  }

  const handleDeleteThread = async () => {
    if (!confirm('למחוק את הנושא כולל כל התגובות?')) return
    await deleteThread(thread.id, categoryId)
  }

  const bestAnswer = replies.find(r => r.is_best_answer)
  const threadImages = getImages(thread)

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">

      {/* Original post */}
      <div className="overflow-hidden rounded-2xl" style={{ background: 'var(--s1)', border: '1px solid var(--bd)' }}>
        <div className="p-5">
          <div className="flex items-start gap-3.5">
            <Avatar profile={thread.profiles} uid={thread.user_id} size={10} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-sm" style={{ color: 'var(--tx)' }}>{dName(thread.profiles)}</span>
                {(thread.profiles as any)?.role === 'admin' && (
                  <span className="rounded-md px-1.5 py-0.5 text-[10px] font-bold" style={{ background: 'rgba(236,72,153,.12)', color: '#db2777' }}>מנהל</span>
                )}
                <span className="text-xs" style={{ color: 'var(--tx3)' }}>{fmtDate(thread.created_at)}</span>
              </div>
              <div className="mt-3">
                <RichContent content={thread.content} />
                {threadImages.length > 0 && <ImageGrid images={threadImages} />}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {(thread.user_id === currentUserId || isAdmin) && (
                  <button onClick={handleDeleteThread}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition hover:bg-red-50 hover:text-red-500"
                    style={{ color: 'var(--tx3)', border: '1px solid var(--bd)' }}>
                    <Trash2 size={11} /> מחק נושא
                  </button>
                )}
                {thread.user_id !== currentUserId && (
                  <ReportButton contentType="forum_thread" contentId={thread.id}
                    buttonClassName="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition hover:bg-red-50 hover:text-red-400"
                    buttonStyle={{ color: 'var(--tx3)', border: '1px solid var(--bd)' }} />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-4 border-t px-5 py-2.5 text-xs" style={{ borderColor: 'var(--bd)', background: 'var(--inp)', color: 'var(--tx3)' }}>
          <span>{replies.length} תגובות</span>
          <span>·</span>
          <span>{thread.views ?? 0} צפיות</span>
          {bestAnswer && (
            <>
              <span>·</span>
              <a href={`#reply-${bestAnswer.id}`} className="flex items-center gap-1 font-semibold text-emerald-600 hover:text-emerald-700 transition">
                <CheckCircle2 size={12} /> נפתר
              </a>
            </>
          )}
        </div>
      </div>

      {/* Best answer callout */}
      {bestAnswer && (
        <div className="flex items-center gap-3 rounded-2xl px-5 py-3.5"
          style={{ background: 'rgba(16,185,129,.06)', border: '1px solid rgba(16,185,129,.2)' }}>
          <CheckCircle2 size={18} className="shrink-0 text-emerald-500" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-emerald-700">תשובה מסומנת כהכי טובה</p>
            <p className="mt-0.5 truncate text-xs text-emerald-600">{bestAnswer.content.split('\n')[0]}</p>
          </div>
          <a href={`#reply-${bestAnswer.id}`} className="ms-auto shrink-0 flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition">
            עבור <ChevronLeft size={12} />
          </a>
        </div>
      )}

      {/* Replies */}
      {replies.length > 0 && (
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--tx3)' }}>
            {replies.length} תגובות
          </p>
          <div className="space-y-3">
            {replies.map((reply, idx) => {
              const isOwn = reply.user_id === currentUserId
              const isEditing = editingId === reply.id
              const replyImages = getImages(reply)

              return (
                <div
                  key={reply.id}
                  id={`reply-${reply.id}`}
                  className="overflow-hidden rounded-2xl transition-colors"
                  style={{
                    background: reply.is_best_answer ? 'rgba(16,185,129,.03)' : 'var(--s1)',
                    border: reply.is_best_answer ? '1px solid rgba(16,185,129,.3)' : '1px solid var(--bd)',
                  }}
                >
                  <div className="flex items-start gap-3 p-4">
                    <div className="flex shrink-0 flex-col items-center gap-2">
                      <span className="text-[11px] font-bold" style={{ color: 'var(--tx3)' }}>#{idx + 1}</span>
                      <Avatar profile={reply.profiles} uid={reply.user_id} size={9} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2.5">
                        <span className="font-bold text-sm" style={{ color: 'var(--tx)' }}>{dName(reply.profiles)}</span>
                        {(reply.profiles as any)?.role === 'admin' && (
                          <span className="rounded-md px-1.5 py-0.5 text-[10px] font-bold" style={{ background: 'rgba(236,72,153,.12)', color: '#db2777' }}>מנהל</span>
                        )}
                        {reply.is_best_answer && (
                          <span className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold" style={{ background: 'rgba(16,185,129,.12)', color: '#059669' }}>
                            <CheckCircle2 size={9} /> הכי טוב
                          </span>
                        )}
                        <span className="ms-auto text-[11px]" style={{ color: 'var(--tx3)' }}>
                          {reply.edited_at && <span className="italic">נערך · </span>}
                          {fmtDate(reply.created_at)}
                        </span>
                      </div>

                      {isEditing ? (
                        <div className="space-y-2">
                          <textarea
                            autoFocus
                            value={editText}
                            onChange={e => setEditText(e.target.value)}
                            rows={4}
                            className="w-full resize-none rounded-xl px-3 py-2 text-sm outline-none"
                            style={{ background: 'var(--inp)', border: '2px solid #7c3aed', color: 'var(--tx)' }}
                          />
                          <div className="flex gap-2">
                            <button onClick={() => handleEditSave(reply.id)}
                              className="rounded-lg px-3 py-1.5 text-xs font-bold text-white"
                              style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
                              שמור
                            </button>
                            <button onClick={() => setEditingId(null)}
                              className="rounded-lg px-3 py-1.5 text-xs" style={{ color: 'var(--tx3)', border: '1px solid var(--bd)' }}>
                              ביטול
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <RichContent content={reply.content} />
                          {replyImages.length > 0 && <ImageGrid images={replyImages} />}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions row */}
                  {!isEditing && (
                    <div className="flex flex-wrap items-center gap-1 border-t px-4 py-2.5"
                      style={{ borderColor: 'var(--bd)', background: 'var(--inp)' }}>
                      {/* Like */}
                      <button onClick={() => handleLike(reply.id)}
                        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition hover:scale-105"
                        style={{
                          background: reply.user_liked ? 'rgba(239,68,68,.1)' : undefined,
                          color: reply.user_liked ? '#ef4444' : 'var(--tx3)',
                          border: reply.user_liked ? '1px solid rgba(239,68,68,.25)' : '1px solid var(--bd)',
                        }}>
                        <Heart size={12} className={reply.user_liked ? 'fill-current' : ''} />
                        {reply.like_count && reply.like_count > 0 ? reply.like_count : ''}
                      </button>

                      {/* Quote */}
                      <button onClick={() => handleQuote(reply)}
                        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition hover:bg-purple-50 hover:text-purple-600"
                        style={{ color: 'var(--tx3)', border: '1px solid var(--bd)' }}>
                        <CornerUpLeft size={11} /> ציטוט
                      </button>

                      {/* Best answer */}
                      {(isThreadAuthor || isAdmin) && (
                        <button onClick={() => handleBestAnswer(reply.id)}
                          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition"
                          style={{
                            background: reply.is_best_answer ? 'rgba(16,185,129,.1)' : undefined,
                            color: reply.is_best_answer ? '#059669' : 'var(--tx3)',
                            border: reply.is_best_answer ? '1px solid rgba(16,185,129,.25)' : '1px solid var(--bd)',
                          }}>
                          <CheckCircle2 size={11} /> {reply.is_best_answer ? 'בטל ✓' : 'הכי טוב'}
                        </button>
                      )}

                      <div className="ms-auto flex items-center gap-1">
                        {isOwn && (
                          <button onClick={() => { setEditingId(reply.id); setEditText(reply.content) }}
                            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs transition hover:bg-amber-50 hover:text-amber-600"
                            style={{ color: 'var(--tx3)', border: '1px solid var(--bd)' }}>
                            <Edit2 size={11} />
                          </button>
                        )}
                        {(isOwn || isAdmin) && (
                          <button onClick={() => handleDeleteReply(reply.id)}
                            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs transition hover:bg-red-50 hover:text-red-500"
                            style={{ color: 'var(--tx3)', border: '1px solid var(--bd)' }}>
                            <Trash2 size={11} />
                          </button>
                        )}
                        {!isOwn && (
                          <ReportButton
                            contentType="forum_reply"
                            contentId={reply.id}
                            buttonClassName="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs transition hover:bg-red-50 hover:text-red-400"
                            buttonStyle={{ color: 'var(--tx3)', border: '1px solid var(--bd)' }}
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Reply form / locked notice */}
      {thread.is_locked ? (
        <div className="rounded-2xl px-5 py-4 text-center text-sm" style={{ background: 'var(--inp)', border: '1px solid var(--bd)', color: 'var(--tx3)' }}>
          🔒 נושא זה נעול — לא ניתן להוסיף תגובות
        </div>
      ) : (
        <div id="reply-form">
          <ReplyEditor
            value={replyText}
            onChange={setReplyText}
            quotedText={quotedText}
            onClearQuote={() => setQuotedText('')}
            imageFiles={replyImages}
            imagePreviews={replyImagePreviews}
            onAddImage={addReplyImage}
            onRemoveImage={removeReplyImage}
            onSubmit={handleReply}
            isSubmitting={isSubmitting}
            fileRef={replyFileRef}
          />
        </div>
      )}
    </div>
  )
}

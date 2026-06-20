'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Heart, Trash2, Edit2, CornerUpLeft, CheckCircle2, ChevronLeft,
  ImageIcon, X, Bold, Italic, List, Quote, ZoomIn, ChevronRight,
  AlertCircle, Bell, BellRing, Link2, Check, Tag, Volume2, Mail, Send,
} from 'lucide-react'
import type { ForumThread, ForumReply, Profile, UserBadge } from '@/types'
import ReportButton from '@/components/ReportButton'
import BadgeDisplay from '@/components/BadgeDisplay'
import {
  createReply, editReply, deleteReply, deleteThread,
  toggleLike, markBestAnswer, getForumImageUploadUrl,
  editThread, toggleFollowThread, markThreadNotificationsRead,
  sendTestBenefitEmail, sendBenefitEmailToAll,
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

function getPostImages(obj: { images?: string[] | null; image_url?: string | null }): string[] {
  if (Array.isArray(obj.images) && obj.images.length > 0) return obj.images
  if (!obj.image_url) return []
  try {
    const p = JSON.parse(obj.image_url)
    return Array.isArray(p) ? p.filter(Boolean) : [obj.image_url]
  } catch { return [obj.image_url] }
}

// ── Rich text ─────────────────────────────────────────────

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function inline(text: string): string {
  const FORUM_URL_RE = /(https?:\/\/[^\s<>'"]+)/g
  const segments = text.split(FORUM_URL_RE)
  return segments.map((seg, i) => {
    if (i % 2 === 1) {
      const href = esc(seg)
      return `<a href="${href}" target="_blank" rel="noopener noreferrer" style="color:#7c3aed;text-decoration:underline;word-break:break-all">${href}</a>`
    }
    return esc(seg)
      .replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight:700">$1</strong>')
      .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
      .replace(/`([^`\n]+)`/g, '<code style="background:rgba(124,58,237,.12);color:#7c3aed;padding:1px 6px;border-radius:4px;font-size:11.5px;font-family:monospace">$1</code>')
  }).join('')
}

function buildHtml(content: string): string {
  const lines = content.split('\n')
  const parts: string[] = []
  let listItems: string[] = []
  const flushList = () => {
    if (!listItems.length) return
    parts.push(`<ul style="margin:6px 0;padding-inline-start:20px;list-style-type:disc">${listItems.map(li => `<li style="margin:3px 0;color:var(--tx)">${li}</li>`).join('')}</ul>`)
    listItems = []
  }
  for (const line of lines) {
    if (line.startsWith('> ')) {
      flushList()
      parts.push(`<div style="border-inline-start:3px solid #a78bfa;margin:6px 0;padding:6px 12px;background:rgba(124,58,237,.05);border-radius:0 8px 8px 0;font-style:italic;color:var(--tx2);font-size:13px">${inline(line.slice(2))}</div>`)
    } else if (line.startsWith('- ') || line.startsWith('• ')) {
      listItems.push(inline(line.slice(2)))
    } else if (line === '') {
      flushList(); parts.push('<div style="height:6px"></div>')
    } else {
      flushList()
      parts.push(`<p style="margin:3px 0;line-height:1.75;color:var(--tx);white-space:pre-wrap">${inline(line)}</p>`)
    }
  }
  flushList()
  return parts.join('')
}

function RichContent({ content }: { content: string }) {
  return <div className="text-sm" dangerouslySetInnerHTML={{ __html: buildHtml(content) }} />
}

// ── Lightbox ──────────────────────────────────────────────

function Lightbox({ images, startIdx, onClose }: { images: string[]; startIdx: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIdx)
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') setIdx(i => (i - 1 + images.length) % images.length)
      if (e.key === 'ArrowRight') setIdx(i => (i + 1) % images.length)
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [images.length, onClose])

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,.93)', backdropFilter: 'blur(12px)' }}
      onClick={onClose}>
      <button onClick={onClose}
        className="absolute end-5 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-white/15"
        style={{ color: 'rgba(255,255,255,.8)' }}>
        <X size={18} />
      </button>
      <div onClick={e => e.stopPropagation()} className="flex flex-col items-center gap-5 px-6">
        <img src={images[idx]} alt=""
          style={{ maxWidth: '90vw', maxHeight: '78vh', objectFit: 'contain', borderRadius: '14px', boxShadow: '0 32px 100px rgba(0,0,0,.7)' }} />
        {images.length > 1 && (
          <div className="flex items-center gap-3">
            <button onClick={() => setIdx(i => (i - 1 + images.length) % images.length)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition hover:bg-white/15 hover:text-white">
              <ChevronRight size={16} />
            </button>
            <span className="min-w-[44px] text-center text-xs" style={{ color: 'rgba(255,255,255,.5)' }}>{idx + 1} / {images.length}</span>
            <button onClick={() => setIdx(i => (i + 1) % images.length)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition hover:bg-white/15 hover:text-white">
              <ChevronLeft size={16} />
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
  const cols = images.length === 1 ? 1 : images.length === 2 ? 2 : 3
  return (
    <>
      <div className="mt-3 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, maxWidth: images.length === 1 ? '100%' : '440px' }}>
        {images.map((url, i) => (
          <div key={i} className="group/img relative cursor-zoom-in overflow-hidden rounded-xl" onClick={() => setLightboxIdx(i)}>
            <img src={url} alt=""
              style={{ width: '100%', aspectRatio: images.length === 1 ? 'auto' : '1', maxHeight: images.length === 1 ? '380px' : undefined, objectFit: images.length === 1 ? 'contain' : 'cover', display: 'block' }} />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover/img:opacity-100" style={{ background: 'rgba(0,0,0,.28)' }}>
              <ZoomIn size={20} className="text-white drop-shadow-md" />
            </div>
          </div>
        ))}
      </div>
      {lightboxIdx !== null && <Lightbox images={images} startIdx={lightboxIdx} onClose={() => setLightboxIdx(null)} />}
    </>
  )
}

// ── Avatar ────────────────────────────────────────────────

function Avatar({ profile, uid, size = 10 }: { profile?: Profile | null; uid: string; size?: number }) {
  const sz = `h-${size} w-${size}`
  return (
    <div className={`${sz} shrink-0 overflow-hidden rounded-full bg-gradient-to-br ${grad(uid)} flex items-center justify-center text-white font-bold`}
      style={{ fontSize: size <= 8 ? '10px' : '12px' }}>
      {profile?.avatar_url
        ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
        : <span>{initials(dName(profile))}</span>
      }
    </div>
  )
}

// ── Tags chips ────────────────────────────────────────────

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
          <button type="button" onClick={() => onChange(tags.filter(x => x !== t))} className="hover:text-red-500 transition"><X size={9} /></button>
        </span>
      ))}
      <input value={input} onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() }
          if (e.key === 'Backspace' && !input && tags.length) onChange(tags.slice(0, -1))
        }}
        onBlur={addTag}
        placeholder={tags.length === 0 ? 'הוסף תגיות...' : ''}
        className="flex-1 min-w-[80px] bg-transparent text-xs outline-none placeholder:text-slate-400"
        style={{ color: 'var(--tx)' }} />
    </div>
  )
}

// ── Mini profile popup ────────────────────────────────────

function MiniProfilePopup({ profile, uid, onClose }: { profile: Profile; uid: string; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div className="absolute start-0 top-full z-40 mt-1 w-60 rounded-2xl p-4 shadow-xl"
        style={{ background: 'var(--s1)', border: '1px solid var(--bd)' }}>
        <div className="flex items-center gap-3 mb-3">
          <Avatar profile={profile} uid={uid} size={11} />
          <div className="min-w-0 flex-1">
            <p className="font-bold text-sm truncate" style={{ color: 'var(--tx)' }}>{dName(profile)}</p>
            {profile.role === 'admin' && (
              <span className="text-[10px] font-bold" style={{ color: '#db2777' }}>מנהל</span>
            )}
          </div>
        </div>
        {profile.specialization && <p className="text-xs mb-2" style={{ color: 'var(--tx3)' }}>{profile.specialization}</p>}
        {profile.bio && <p className="text-xs mb-3 line-clamp-2" style={{ color: 'var(--tx2)' }}>{profile.bio}</p>}
        <div className="flex gap-2">
          <a href={`/profile/${uid}`}
            className="flex-1 text-center rounded-lg py-1.5 text-xs font-semibold transition hover:opacity-80"
            style={{ background: 'var(--inp)', border: '1px solid var(--bd)', color: 'var(--tx2)' }}>
            פרופיל
          </a>
          <a href={`/chat?dm=${uid}`}
            className="flex-1 text-center rounded-lg py-1.5 text-xs font-bold text-white transition hover:opacity-90"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
            הודעה
          </a>
        </div>
      </div>
    </>
  )
}

// ── Reply Editor ──────────────────────────────────────────

type EditorProps = {
  value: string; onChange: (v: string) => void
  quotedText: string; onClearQuote: () => void
  imageFiles: File[]; imagePreviews: string[]
  onAddImage: (f: File) => void; onRemoveImage: (i: number) => void
  onSubmit: () => void; isSubmitting: boolean
  uploadError: string | null
  fileRef: React.RefObject<HTMLInputElement | null>
}

function ReplyEditor({ value, onChange, quotedText, onClearQuote, imageFiles, imagePreviews, onAddImage, onRemoveImage, onSubmit, isSubmitting, uploadError, fileRef }: EditorProps) {
  const taRef = useRef<HTMLTextAreaElement>(null)

  const insertFormat = (prefix: string, suffix = prefix, placeholder = 'טקסט') => {
    const el = taRef.current; if (!el) return
    const s = el.selectionStart, e2 = el.selectionEnd
    const sel = value.slice(s, e2)
    const ins = sel ? `${prefix}${sel}${suffix}` : `${prefix}${placeholder}${suffix}`
    onChange(value.slice(0, s) + ins + value.slice(e2))
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(sel ? s + ins.length : s + prefix.length, sel ? s + ins.length : s + prefix.length + placeholder.length)
    })
  }

  const insertLinePrefix = (prefix: string) => {
    const el = taRef.current; if (!el) return
    const pos = el.selectionStart
    const lineStart = value.lastIndexOf('\n', pos - 1) + 1
    onChange(value.slice(0, lineStart) + prefix + value.slice(lineStart))
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(pos + prefix.length, pos + prefix.length) })
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    Array.from(e.clipboardData.items).filter(i => i.type.startsWith('image/')).forEach(i => { const f = i.getAsFile(); if (f) onAddImage(f) })
  }

  const canSend = (value.trim() || quotedText || imageFiles.length > 0) && !isSubmitting

  return (
    <div className="overflow-hidden rounded-2xl" style={{ background: 'var(--s1)', border: '1px solid var(--bd)', boxShadow: '0 2px 12px rgba(0,0,0,.04)' }}>
      <div className="flex items-center gap-2 border-b px-4 py-2.5" style={{ borderColor: 'var(--bd)', background: 'var(--inp)' }}>
        <span className="text-xs font-bold" style={{ color: 'var(--tx)' }}>הוסף תגובה</span>
      </div>
      <div className="flex items-center gap-0.5 border-b px-3 py-1.5" style={{ borderColor: 'var(--bd)', background: 'var(--inp)' }}>
        {([
          { icon: <Bold size={12} strokeWidth={2.5} />, fn: () => insertFormat('**', '**', 'מודגש'), title: 'מודגש' },
          { icon: <Italic size={12} />, fn: () => insertFormat('*', '*', 'נטוי'), title: 'נטוי' },
          { icon: <List size={12} />, fn: () => insertLinePrefix('- '), title: 'רשימה' },
          { icon: <Quote size={12} />, fn: () => insertLinePrefix('> '), title: 'ציטוט' },
        ] as const).map((btn, i) => (
          <button key={i} type="button" onClick={btn.fn} title={btn.title}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-purple-100 hover:text-purple-600"
            style={{ color: 'var(--tx3)' }}>{btn.icon}</button>
        ))}
        <div className="mx-1.5 h-3.5 w-px" style={{ background: 'var(--bd)' }} />
        <button type="button" onClick={() => fileRef.current?.click()}
          className="flex h-7 items-center gap-1.5 rounded-lg px-2 text-[11px] transition hover:bg-purple-100 hover:text-purple-600"
          style={{ color: 'var(--tx3)' }}>
          <ImageIcon size={12} /> תמונות
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
          onChange={e => { Array.from(e.target.files ?? []).forEach(onAddImage); if (fileRef.current) fileRef.current.value = '' }} />
        <span className="ms-auto text-[10px]" style={{ color: 'var(--tx3)' }}>Ctrl+Enter לשליחה</span>
      </div>

      <div className="p-4 space-y-3" onPaste={handlePaste}>
        {quotedText && (
          <div className="flex items-start gap-2 rounded-xl border-s-[3px] border-purple-400 px-3 py-2" style={{ background: 'rgba(124,58,237,.05)' }}>
            <CornerUpLeft size={12} className="mt-0.5 shrink-0 text-purple-500" />
            <p className="flex-1 truncate text-xs italic" style={{ color: 'var(--tx3)' }}>
              {quotedText.split('\n').find(l => l.startsWith('> **'))?.replace(/^> \*\*(.+?)\*\*:.*/, '$1') ?? 'ציטוט'}
            </p>
            <button onClick={onClearQuote} className="shrink-0 rounded p-0.5 hover:bg-red-100" style={{ color: 'var(--tx3)' }}><X size={11} /></button>
          </div>
        )}
        <textarea ref={taRef} value={value} onChange={e => onChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey && canSend) { e.preventDefault(); onSubmit() } }}
          rows={5} placeholder={'כתוב תגובה...\n\n**מודגש** · *נטוי* · - רשימה · > ציטוט'}
          className="w-full resize-none rounded-xl px-4 py-3 text-sm outline-none transition placeholder:text-slate-400"
          style={{ background: 'var(--inp)', border: '1px solid var(--bd)', color: 'var(--tx)', lineHeight: '1.75' }} />

        {imagePreviews.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {imagePreviews.map((src, idx) => (
              <div key={idx} className="group/th relative">
                <img src={src} alt="" style={{ width: '72px', height: '72px', objectFit: 'cover', borderRadius: '10px', display: 'block' }} />
                <button onClick={() => onRemoveImage(idx)}
                  className="absolute -end-1.5 -top-1.5 rounded-full p-0.5 opacity-0 transition group-hover/th:opacity-100"
                  style={{ background: 'rgba(0,0,0,.75)', color: 'white' }}><X size={10} /></button>
              </div>
            ))}
            <button type="button" onClick={() => fileRef.current?.click()}
              className="flex h-[72px] w-[72px] items-center justify-center rounded-[10px] transition hover:border-purple-300"
              style={{ border: '2px dashed var(--bd)' }}>
              <ImageIcon size={15} style={{ color: 'var(--tx3)' }} />
            </button>
          </div>
        )}

        {uploadError && (
          <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs"
            style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', color: '#ef4444' }}>
            <AlertCircle size={13} /> {uploadError}
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <button onClick={onSubmit} disabled={!canSend}
            className="rounded-xl px-6 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', boxShadow: canSend ? '0 4px 14px rgba(124,58,237,.28)' : 'none' }}>
            {isSubmitting ? 'שולח...' : 'שלח תגובה'}
          </button>
          <span className="text-[11px]" style={{ color: 'var(--tx3)' }}>
            {imagePreviews.length > 0 ? `${imagePreviews.length} תמונות` : 'Ctrl+V להדבקת תמונה'}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Audio system ──────────────────────────────────────────

type SoundType = 'message' | 'notification' | 'pop' | 'bell' | 'chime' | 'none'
const SOUND_OPTIONS: { value: SoundType; label: string; icon: string }[] = [
  { value: 'message',      label: 'הודעה',  icon: '💬' },
  { value: 'notification', label: 'התראה',  icon: '🔔' },
  { value: 'pop',          label: 'Pop',    icon: '🫧' },
  { value: 'bell',         label: 'פעמון', icon: '🔕' },
  { value: 'chime',        label: 'צלצול', icon: '🎵' },
  { value: 'none',         label: 'השתק',  icon: '🔇' },
]
const FORUM_SOUND_PREF_PREFIX = 'sndPref_thread_'
function playForumSound(type: SoundType) {
  if (type === 'none') return
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const play = (freq: number, time: number, dur: number) => {
      const osc = ctx.createOscillator(); const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'sine'; osc.frequency.value = freq
      gain.gain.setValueAtTime(0, time)
      gain.gain.linearRampToValueAtTime(0.4, time + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, time + dur)
      osc.start(time); osc.stop(time + dur)
    }
    if (type === 'message') {
      play(880, ctx.currentTime, 0.15)
      play(1100, ctx.currentTime + 0.1, 0.2)
      setTimeout(() => ctx.close(), 500)
    } else if (type === 'notification') {
      ;[523, 659, 784].forEach((freq, i) => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.type = 'sine'; osc.frequency.value = freq
        const t = ctx.currentTime + i * 0.12
        gain.gain.setValueAtTime(0, t)
        gain.gain.linearRampToValueAtTime(0.3, t + 0.01)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2)
        osc.start(t); osc.stop(t + 0.2)
      })
      setTimeout(() => ctx.close(), 800)
    } else if (type === 'pop') {
      const osc = ctx.createOscillator(); const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(150, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.08)
      gain.gain.setValueAtTime(0.5, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.08)
      setTimeout(() => ctx.close(), 300)
    } else if (type === 'bell') {
      const freqs = [440, 880, 1320, 1760]
      const gVals = [1, 0.6, 0.4, 0.2]
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.type = 'sine'; osc.frequency.value = freq
        gain.gain.setValueAtTime(gVals[i] * 0.3, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5)
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 1.5)
      })
      setTimeout(() => ctx.close(), 2000)
    } else if (type === 'chime') {
      ;[523, 659, 784, 1047].forEach((freq, i) => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.type = 'triangle'; osc.frequency.value = freq
        const t = ctx.currentTime + i * 0.15
        gain.gain.setValueAtTime(0.25, t)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4)
        osc.start(t); osc.stop(t + 0.4)
      })
      setTimeout(() => ctx.close(), 1500)
    }
  } catch {}
}

function ForumSoundPicker({ current, onSelect, onClose, rect }: { current: SoundType; onSelect: (s: SoundType) => void; onClose: () => void; rect: DOMRect | null }) {
  if (!rect) return null
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={onClose} />
      <div style={{
        position: 'fixed',
        zIndex: 9999,
        top: rect.bottom + 6,
        left: rect.left,
        width: 160,
        background: 'var(--s1)',
        border: '1px solid var(--bd)',
        borderRadius: 12,
        boxShadow: '0 4px 24px rgba(0,0,0,.16)',
        overflow: 'hidden',
      }}>
        {SOUND_OPTIONS.map((opt, i) => (
          <button key={opt.value} onClick={() => { playForumSound(opt.value); onSelect(opt.value); onClose() }}
            className="flex w-full items-center gap-2 px-3 py-2 text-xs transition hover:bg-purple-50/60"
            style={{
              color: 'var(--tx)',
              borderBottom: i < SOUND_OPTIONS.length - 1 ? '1px solid var(--bd)' : undefined,
              background: current === opt.value ? 'rgba(124,58,237,.08)' : undefined,
            }}>
            <span>{opt.icon}</span><span className="flex-1 text-start">{opt.label}</span>
            {current === opt.value && <Check size={11} className="ms-auto text-purple-600" />}
          </button>
        ))}
      </div>
    </>
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
  categoryAdminOnly: boolean
  isThreadAuthor: boolean
  badgesMap?: Record<string, UserBadge[]>
}

const REPLIES_PER_PAGE = 20
const REPLY_DRAFT_KEY_PREFIX = 'replyDraft_'

// ── Main ──────────────────────────────────────────────────

export default function ThreadClient({
  thread, replies: initialReplies, currentUserId, currentProfile, isAdmin, categoryId, categoryAdminOnly, isThreadAuthor,
  badgesMap = {},
}: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [replies, setReplies] = useState(initialReplies)
  const [replyText, setReplyText] = useState('')
  const [quotedText, setQuotedText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [replyFiles, setReplyFiles] = useState<File[]>([])
  const [replyPreviews, setReplyPreviews] = useState<string[]>([])
  const replyFileRef = useRef<HTMLInputElement>(null)

  // Thread edit state
  const [editingThread, setEditingThread] = useState(false)
  const [editTitle, setEditTitle] = useState(thread.title)
  const [editContent, setEditContent] = useState(thread.content)
  const [editTags, setEditTags] = useState<string[]>((thread.tags ?? []) as string[])
  const [isSavingThread, setIsSavingThread] = useState(false)

  // Follow state
  const [isFollowing, setIsFollowing] = useState(((thread.followers ?? []) as string[]).includes(currentUserId))

  // Pagination
  const [page, setPage] = useState(0)

  // Copy link
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Profile popup
  const [profilePopup, setProfilePopup] = useState<{ profile: Profile; uid: string } | null>(null)

  // Sound
  const [threadSoundPref, setThreadSoundPref] = useState<SoundType>('message')
  const [soundPickerOpen, setSoundPickerOpen] = useState(false)
  const [soundPickerRect, setSoundPickerRect] = useState<DOMRect | null>(null)
  const threadSoundPrefRef = useRef<SoundType>('message')
  threadSoundPrefRef.current = threadSoundPref
  const isFollowingRef = useRef(false)
  isFollowingRef.current = isFollowing
  const prevReplyCountRef = useRef(-1)
  const hasInitializedRef = useRef(false)

  // Benefit email state
  const [benefitTestSending, setBenefitTestSending] = useState(false)
  const [benefitAllSending, setBenefitAllSending] = useState(false)
  const [benefitMsg, setBenefitMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // Last read banner
  const [lastReadReplyId, setLastReadReplyId] = useState<string | null>(null)
  const [showLastReadBanner, setShowLastReadBanner] = useState(false)

  const refresh = () => { startTransition(() => { router.refresh() }) }

  // Sync replies from server — play sound if new replies arrived while following
  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true
      prevReplyCountRef.current = initialReplies.length
      setReplies(initialReplies)
      return
    }
    if (initialReplies.length > prevReplyCountRef.current) {
      const newReplies = initialReplies.slice(prevReplyCountRef.current)
      const hasOtherReply = newReplies.some(r => r.user_id !== currentUserId)
      if (isFollowingRef.current && hasOtherReply) {
        playForumSound(threadSoundPrefRef.current)
      }
    }
    prevReplyCountRef.current = initialReplies.length
    setReplies(initialReplies)
  }, [initialReplies]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sound pref — restore from localStorage + register audio unlock gesture
  useEffect(() => {
    try {
      const saved = localStorage.getItem(FORUM_SOUND_PREF_PREFIX + thread.id) as SoundType | null
      if (saved && SOUND_OPTIONS.some(o => o.value === saved)) setThreadSoundPref(saved)
    } catch {}
  }, [thread.id])

  // Mark forum notifications for this thread as read on mount
  useEffect(() => {
    markThreadNotificationsRead(thread.id, categoryId).catch(() => {})
  }, [thread.id, categoryId])

  // Reply draft — restore on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REPLY_DRAFT_KEY_PREFIX + thread.id)
      if (saved) setReplyText(saved)
    } catch {}
  }, [thread.id])

  // Reply draft — save on change
  useEffect(() => {
    try {
      if (replyText) localStorage.setItem(REPLY_DRAFT_KEY_PREFIX + thread.id, replyText)
      else localStorage.removeItem(REPLY_DRAFT_KEY_PREFIX + thread.id)
    } catch {}
  }, [replyText, thread.id])

  // Scroll to hash on mount
  useEffect(() => {
    const hash = window.location.hash
    if (hash) {
      setTimeout(() => {
        const el = document.getElementById(hash.slice(1))
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 200)
    }
  }, [])

  // Last read tracking — check on mount
  useEffect(() => {
    try {
      const savedId = localStorage.getItem(`lastRead_${thread.id}`)
      if (!savedId || initialReplies.length === 0) return
      const savedIdx = initialReplies.findIndex(r => r.id === savedId)
      if (savedIdx >= 0 && savedIdx < initialReplies.length - 1) {
        setLastReadReplyId(savedId)
        setShowLastReadBanner(true)
      }
    } catch {}
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Mark as read when all replies are visible
  const markRead = () => {
    if (replies.length === 0) return
    try { localStorage.setItem(`lastRead_${thread.id}`, replies[replies.length - 1].id) } catch {}
    setShowLastReadBanner(false)
  }

  const addReplyImage = (f: File) => {
    if (!f.type.startsWith('image/')) return
    setReplyFiles(p => [...p, f])
    setReplyPreviews(p => [...p, URL.createObjectURL(f)])
  }
  const removeReplyImage = (i: number) => {
    setReplyFiles(p => p.filter((_, j) => j !== i))
    setReplyPreviews(p => p.filter((_, j) => j !== i))
  }

  const handleReply = async () => {
    const full = quotedText ? `${quotedText}${replyText.trim()}` : replyText.trim()
    if (!full && replyFiles.length === 0) return
    setIsSubmitting(true)
    setUploadError(null)
    try {
      const urls: string[] = []
      const failedFiles: string[] = []
      for (const file of replyFiles) {
        const { signedUrl, publicUrl, error } = await getForumImageUploadUrl(file.type)
        if (error || !signedUrl || !publicUrl) {
          failedFiles.push(file.name)
          continue
        }
        const uploadRes = await fetch(signedUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
        if (!uploadRes.ok) { failedFiles.push(file.name); continue }
        urls.push(publicUrl)
      }
      if (failedFiles.length > 0) {
        setUploadError(`שגיאה בהעלאת: ${failedFiles.join(', ')}`)
        setIsSubmitting(false)
        return
      }

      // Optimistic reply
      const optimistic: ForumReply = {
        id: `opt-${Date.now()}`, thread_id: thread.id, user_id: currentUserId,
        content: full || ' ', images: urls.length > 0 ? urls : [], image_url: null,
        is_best_answer: false, edited_at: null, created_at: new Date().toISOString(),
        profiles: currentProfile ?? undefined, like_count: 0, user_liked: false,
      }
      setReplies(prev => {
        const next = [...prev, optimistic]
        const neededPage = Math.ceil(next.length / REPLIES_PER_PAGE) - 1
        setPage(p => Math.max(p, neededPage))
        return next
      })
      setReplyText(''); setQuotedText('')
      setReplyFiles([]); setReplyPreviews([])
      if (replyFileRef.current) replyFileRef.current.value = ''
      try { localStorage.removeItem(REPLY_DRAFT_KEY_PREFIX + thread.id) } catch {}

      const { error: replyErr } = await createReply(thread.id, categoryId, full || ' ', urls.length > 0 ? urls : undefined)
      if (replyErr) {
        setReplies(prev => prev.filter(r => !r.id.startsWith('opt-')))
        setUploadError(replyErr)
        setIsSubmitting(false)
        return
      }
      markRead()
      refresh()
    } finally { setIsSubmitting(false) }
  }

  const handleEditThread = async () => {
    if (!editTitle.trim() || !editContent.trim() || isSavingThread) return
    setIsSavingThread(true)
    await editThread(thread.id, categoryId, editTitle, editContent, editTags)
    setEditingThread(false)
    setIsSavingThread(false)
    refresh()
  }

  const handleFollowThread = async () => {
    const next = !isFollowing
    setIsFollowing(next)
    await toggleFollowThread(thread.id)
  }

  const copyReplyLink = async (replyId: string) => {
    const url = window.location.href.split('#')[0] + '#reply-' + replyId
    await navigator.clipboard.writeText(url)
    setCopiedId(replyId)
    setTimeout(() => setCopiedId(null), 2000)
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
    await markBestAnswer(replyId, thread.id, categoryId); refresh()
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

  const handleBenefitTestEmail = async () => {
    setBenefitTestSending(true)
    setBenefitMsg(null)
    const result = await sendTestBenefitEmail(thread.id, categoryId)
    setBenefitTestSending(false)
    setBenefitMsg(result.error ? { ok: false, text: result.error } : { ok: true, text: 'מייל ניסיון נשלח בהצלחה!' })
  }

  const handleBenefitSendAll = async () => {
    if (!confirm('לשלוח מייל הטבה לכל חברי הקהילה הפעילים?')) return
    setBenefitAllSending(true)
    setBenefitMsg(null)
    const result = await sendBenefitEmailToAll(thread.id, categoryId)
    setBenefitAllSending(false)
    setBenefitMsg(result.error ? { ok: false, text: result.error } : { ok: true, text: `נשלח בהצלחה ל-${result.sent} חברים` })
  }

  const bestAnswer = replies.find(r => r.is_best_answer)
  const threadImages = getPostImages(thread)
  const threadTags = (thread.tags ?? []) as string[]
  const visibleReplies = replies.slice(0, (page + 1) * REPLIES_PER_PAGE)
  const hasMore = replies.length > visibleReplies.length

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">

      {/* Last read banner */}
      {showLastReadBanner && lastReadReplyId && (
        <div className="flex items-center gap-3 rounded-2xl px-5 py-3 shadow-lg"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: 'white' }}>
          <span className="flex-1 text-sm font-medium">יש תגובות חדשות מאז ביקורך האחרון</span>
          <button
            onClick={() => {
              const nextIdx = replies.findIndex(r => r.id === lastReadReplyId) + 1
              if (nextIdx > 0 && nextIdx < replies.length) {
                const neededPage = Math.ceil((nextIdx + 1) / REPLIES_PER_PAGE) - 1
                setPage(p => Math.max(p, neededPage))
                setTimeout(() => {
                  document.getElementById(`reply-${replies[nextIdx].id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }, 100)
              }
              setShowLastReadBanner(false)
            }}
            className="rounded-lg px-3 py-1.5 text-xs font-bold transition hover:opacity-90"
            style={{ background: 'rgba(255,255,255,.2)', border: '1px solid rgba(255,255,255,.3)' }}>
            קפוץ לאחרון
          </button>
          <button onClick={() => setShowLastReadBanner(false)} className="p-1 hover:opacity-70"><X size={14} /></button>
        </div>
      )}

      {/* Admin benefit email panel */}
      {isAdmin && categoryAdminOnly && (
        <div className="overflow-hidden rounded-2xl" style={{ background: 'rgba(109,40,217,.06)', border: '1px solid rgba(109,40,217,.25)' }}>
          <div className="flex flex-wrap items-center gap-3 px-5 py-3.5">
            <span className="text-sm font-bold" style={{ color: '#6d28d9' }}>🎁 שליחת הטבה למנויים</span>
            <div className="ms-auto flex flex-wrap items-center gap-2">
              <button
                onClick={handleBenefitTestEmail}
                disabled={benefitTestSending || benefitAllSending}
                className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition hover:opacity-90 disabled:opacity-50"
                style={{ background: 'rgba(109,40,217,.12)', color: '#6d28d9', border: '1px solid rgba(109,40,217,.3)' }}>
                <Mail size={13} />
                {benefitTestSending ? 'שולח...' : 'שלח לי ניסיון'}
              </button>
              <button
                onClick={handleBenefitSendAll}
                disabled={benefitTestSending || benefitAllSending}
                className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#6d28d9,#7c3aed)', boxShadow: '0 4px 12px rgba(109,40,217,.3)' }}>
                <Send size={13} />
                {benefitAllSending ? 'שולח...' : 'שלח לכולם'}
              </button>
            </div>
          </div>
          {benefitMsg && (
            <div className="border-t px-5 py-2.5 text-xs font-semibold"
              style={{
                borderColor: 'rgba(109,40,217,.2)',
                color: benefitMsg.ok ? '#059669' : '#ef4444',
                background: benefitMsg.ok ? 'rgba(5,150,105,.06)' : 'rgba(239,68,68,.06)',
              }}>
              {benefitMsg.ok ? '✓ ' : '✗ '}{benefitMsg.text}
            </div>
          )}
        </div>
      )}

      {/* Original post */}
      <div className="overflow-hidden rounded-2xl" style={{ background: 'var(--s1)', border: '1px solid var(--bd)', boxShadow: '0 2px 12px rgba(0,0,0,.04)' }}>
        <div className="p-5">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <Avatar profile={thread.profiles} uid={thread.user_id} size={11} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <button
                  className="relative font-bold text-sm hover:text-purple-600 transition"
                  style={{ color: 'var(--tx)' }}
                  onClick={() => thread.profiles && setProfilePopup(
                    profilePopup?.uid === thread.user_id ? null : { profile: thread.profiles, uid: thread.user_id }
                  )}>
                  {dName(thread.profiles)}
                  {profilePopup?.uid === thread.user_id && thread.profiles && (
                    <MiniProfilePopup profile={profilePopup.profile} uid={profilePopup.uid} onClose={() => setProfilePopup(null)} />
                  )}
                </button>
                {(thread.profiles as any)?.role === 'admin' && (
                  <span className="rounded-md px-1.5 py-0.5 text-[10px] font-bold" style={{ background: 'rgba(236,72,153,.12)', color: '#db2777' }}>מנהל</span>
                )}
                {badgesMap[thread.user_id] && <BadgeDisplay badges={badgesMap[thread.user_id]} max={2} />}
                <span className="text-xs" style={{ color: 'var(--tx3)' }}>{fmtDate(thread.created_at)}</span>
              </div>

              {editingThread ? (
                <div className="space-y-3 mt-2">
                  <input
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold outline-none"
                    style={{ background: 'var(--inp)', border: '2px solid #7c3aed', color: 'var(--tx)' }}
                    placeholder="כותרת"
                  />
                  <textarea
                    autoFocus
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    rows={6}
                    className="w-full resize-none rounded-xl px-4 py-3 text-sm outline-none"
                    style={{ background: 'var(--inp)', border: '2px solid #7c3aed', color: 'var(--tx)', lineHeight: '1.7' }}
                  />
                  <TagsInput tags={editTags} onChange={setEditTags} />
                  <div className="flex gap-2">
                    <button onClick={handleEditThread} disabled={isSavingThread}
                      className="rounded-xl px-5 py-2 text-sm font-bold text-white disabled:opacity-40"
                      style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
                      {isSavingThread ? 'שומר...' : 'שמור'}
                    </button>
                    <button onClick={() => setEditingThread(false)}
                      className="rounded-xl px-4 py-2 text-sm" style={{ color: 'var(--tx3)', border: '1px solid var(--bd)' }}>
                      ביטול
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <RichContent content={thread.content} />
                  {threadImages.length > 0 && <ImageGrid images={threadImages} />}
                  {threadTags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {threadTags.map(t => (
                        <span key={t} className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                          style={{ background: 'rgba(124,58,237,.1)', color: '#7c3aed', border: '1px solid rgba(124,58,237,.2)' }}>
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}

              {!editingThread && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {(isThreadAuthor || isAdmin) && (
                    <button
                      onClick={() => { setEditTitle(thread.title); setEditContent(thread.content); setEditTags((thread.tags ?? []) as string[]); setEditingThread(true) }}
                      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition hover:bg-amber-50 hover:text-amber-600"
                      style={{ color: 'var(--tx3)', border: '1px solid var(--bd)' }}>
                      <Edit2 size={11} /> ערוך נושא
                    </button>
                  )}
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
                  <div className="relative ms-auto flex items-center gap-1">
                    <button onClick={handleFollowThread}
                      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition"
                      style={isFollowing ? {
                        background: '#7c3aed', color: 'white', border: '1px solid #7c3aed',
                      } : {
                        background: 'var(--s1)', color: 'var(--tx2)', border: '1px solid var(--bd)',
                      }}>
                      {isFollowing ? <><BellRing size={11} /> עוקב ✓</> : <><Bell size={11} /> עקוב</>}
                    </button>
                    <button
                      onClick={(e) => { setSoundPickerRect(e.currentTarget.getBoundingClientRect()); setSoundPickerOpen(o => !o) }}
                      title="בחר צליל לאשון"
                      className="flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-purple-50"
                      style={{ color: 'var(--tx3)', border: '1px solid var(--bd)' }}>
                      <Volume2 size={11} />
                    </button>
                    {soundPickerOpen && (
                      <ForumSoundPicker
                        current={threadSoundPref}
                        rect={soundPickerRect}
                        onSelect={s => {
                          setThreadSoundPref(s)
                          try { localStorage.setItem(FORUM_SOUND_PREF_PREFIX + thread.id, s) } catch {}
                          setSoundPickerOpen(false)
                        }}
                        onClose={() => setSoundPickerOpen(false)}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 border-t px-5 py-2.5 text-xs"
          style={{ borderColor: 'var(--bd)', background: 'var(--inp)', color: 'var(--tx3)' }}>
          <span>{replies.length} תגובות</span>
          <span>·</span>
          <span>{thread.views ?? 0} צפיות</span>
          {bestAnswer && (
            <><span>·</span>
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
          <p className="mb-3 px-1 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--tx3)' }}>
            {replies.length} תגובות
          </p>
          <div className="space-y-3">
            {visibleReplies.map((reply, idx) => {
              const isOwn = reply.user_id === currentUserId
              const isEditing = editingId === reply.id
              const imgs = getPostImages(reply)
              const isCopied = copiedId === reply.id

              return (
                <div key={reply.id} id={`reply-${reply.id}`}
                  className="overflow-hidden rounded-2xl"
                  style={{
                    background: reply.is_best_answer ? 'rgba(16,185,129,.03)' : 'var(--s1)',
                    border: reply.is_best_answer ? '1px solid rgba(16,185,129,.3)' : '1px solid var(--bd)',
                    boxShadow: '0 1px 4px rgba(0,0,0,.04)',
                  }}>
                  <div className="flex items-start gap-3 p-4">
                    <div className="flex shrink-0 flex-col items-center gap-2 pt-0.5">
                      <span className="text-[10px] font-bold" style={{ color: 'var(--tx3)' }}>#{idx + 1}</span>
                      <Avatar profile={reply.profiles} uid={reply.user_id} size={9} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2.5">
                        <div className="relative">
                          <button
                            className="font-bold text-sm hover:text-purple-600 transition"
                            style={{ color: 'var(--tx)' }}
                            onClick={() => reply.profiles && setProfilePopup(
                              profilePopup?.uid === reply.user_id && profilePopup.profile === reply.profiles
                                ? null
                                : { profile: reply.profiles, uid: reply.user_id }
                            )}>
                            {dName(reply.profiles)}
                          </button>
                          {profilePopup?.uid === reply.user_id && reply.profiles && profilePopup.profile === reply.profiles && (
                            <MiniProfilePopup profile={profilePopup.profile} uid={profilePopup.uid} onClose={() => setProfilePopup(null)} />
                          )}
                        </div>
                        {(reply.profiles as any)?.role === 'admin' && (
                          <span className="rounded-md px-1.5 py-0.5 text-[10px] font-bold" style={{ background: 'rgba(236,72,153,.12)', color: '#db2777' }}>מנהל</span>
                        )}
                        {badgesMap[reply.user_id] && <BadgeDisplay badges={badgesMap[reply.user_id]} max={2} />}
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
                          <textarea autoFocus value={editText} onChange={e => setEditText(e.target.value)} rows={4}
                            className="w-full resize-none rounded-xl px-3 py-2 text-sm outline-none"
                            style={{ background: 'var(--inp)', border: '2px solid #7c3aed', color: 'var(--tx)' }} />
                          <div className="flex gap-2">
                            <button onClick={() => handleEditSave(reply.id)}
                              className="rounded-lg px-3 py-1.5 text-xs font-bold text-white"
                              style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>שמור</button>
                            <button onClick={() => setEditingId(null)}
                              className="rounded-lg px-3 py-1.5 text-xs" style={{ color: 'var(--tx3)', border: '1px solid var(--bd)' }}>ביטול</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <RichContent content={reply.content} />
                          {imgs.length > 0 && <ImageGrid images={imgs} />}
                        </>
                      )}
                    </div>
                  </div>

                  {!isEditing && (
                    <div className="flex flex-wrap items-center gap-1 border-t px-4 py-2.5"
                      style={{ borderColor: 'var(--bd)', background: 'var(--inp)' }}>
                      <button onClick={() => handleLike(reply.id)}
                        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition hover:scale-105"
                        style={{
                          background: reply.user_liked ? 'rgba(239,68,68,.1)' : undefined,
                          color: reply.user_liked ? '#ef4444' : 'var(--tx3)',
                          border: reply.user_liked ? '1px solid rgba(239,68,68,.25)' : '1px solid var(--bd)',
                        }}>
                        <Heart size={12} className={reply.user_liked ? 'fill-current' : ''} />
                        {(reply.like_count ?? 0) > 0 ? reply.like_count : ''}
                      </button>

                      <button onClick={() => handleQuote(reply)}
                        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition hover:bg-purple-50 hover:text-purple-600"
                        style={{ color: 'var(--tx3)', border: '1px solid var(--bd)' }}>
                        <CornerUpLeft size={11} /> ציטוט
                      </button>

                      <button onClick={() => copyReplyLink(reply.id)}
                        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition"
                        style={{
                          background: isCopied ? 'rgba(16,185,129,.1)' : undefined,
                          color: isCopied ? '#059669' : 'var(--tx3)',
                          border: isCopied ? '1px solid rgba(16,185,129,.3)' : '1px solid var(--bd)',
                        }}
                        title="העתק קישור לתגובה">
                        {isCopied ? <><Check size={11} /> הועתק!</> : <Link2 size={11} />}
                      </button>

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
                          <ReportButton contentType="forum_reply" contentId={reply.id}
                            buttonClassName="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs transition hover:bg-red-50 hover:text-red-400"
                            buttonStyle={{ color: 'var(--tx3)', border: '1px solid var(--bd)' }} />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Load more */}
          {hasMore && (
            <button
              onClick={() => { setPage(p => p + 1); setTimeout(markRead, 300) }}
              className="mt-4 w-full rounded-2xl py-3 text-sm font-semibold transition hover:opacity-80"
              style={{ background: 'var(--inp)', border: '1px solid var(--bd)', color: 'var(--tx2)' }}>
              טען עוד {Math.min(REPLIES_PER_PAGE, replies.length - visibleReplies.length)} תגובות
            </button>
          )}

          {!hasMore && replies.length > 0 && (
            <p className="mt-3 text-center text-xs" style={{ color: 'var(--tx3)' }}>
              {replies.length === 1 ? 'תגובה אחת' : `כל ${replies.length} התגובות`}
            </p>
          )}
        </div>
      )}

      {/* Reply form */}
      {thread.is_locked ? (
        <div className="rounded-2xl px-5 py-4 text-center text-sm"
          style={{ background: 'var(--inp)', border: '1px solid var(--bd)', color: 'var(--tx3)' }}>
          🔒 נושא זה נעול — לא ניתן להוסיף תגובות
        </div>
      ) : (
        <div id="reply-form">
          <ReplyEditor
            value={replyText} onChange={setReplyText}
            quotedText={quotedText} onClearQuote={() => setQuotedText('')}
            imageFiles={replyFiles} imagePreviews={replyPreviews}
            onAddImage={addReplyImage} onRemoveImage={removeReplyImage}
            onSubmit={handleReply} isSubmitting={isSubmitting}
            uploadError={uploadError} fileRef={replyFileRef}
          />
        </div>
      )}
    </div>
  )
}

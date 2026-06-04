'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, Trash2, Edit2, CornerUpLeft, CheckCircle2, ChevronLeft, ImageIcon, X } from 'lucide-react'
import type { ForumThread, ForumReply, Profile } from '@/types'
import ReportButton from '@/components/ReportButton'
import {
  createReply, editReply, deleteReply, deleteThread,
  toggleLike, markBestAnswer, getForumImageUploadUrl,
} from '../../actions'

// ── helpers ──────────────────────────────────────────────

function fmtDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'עכשיו'
  if (diffMins < 60) return `לפני ${diffMins} דק'`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `לפני ${diffHours}ש'`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `לפני ${diffDays} ימים`
  return d.toLocaleDateString('he-IL')
}

function dName(p?: Profile | null) { return p?.full_name ?? p?.username ?? 'משתמש' }

function initials(name: string) { return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() }

const GRADS = ['from-violet-500 to-purple-700', 'from-pink-500 to-rose-700', 'from-blue-500 to-indigo-700', 'from-emerald-500 to-teal-700']
function grad(uid: string) {
  let h = 0; for (let i = 0; i < uid.length; i++) h = (Math.imul(31, h) + uid.charCodeAt(i)) | 0
  return GRADS[Math.abs(h) % GRADS.length]
}

function Avatar({ profile, uid, size = 10 }: { profile?: Profile | null; uid: string; size?: number }) {
  const sz = `h-${size} w-${size}`
  return (
    <div className={`${sz} shrink-0 rounded-full overflow-hidden bg-gradient-to-br ${grad(uid)} flex items-center justify-center text-xs font-bold text-white`}>
      {profile?.avatar_url
        ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
        : <span>{initials(dName(profile))}</span>
      }
    </div>
  )
}

function ContentBlock({ content }: { content: string }) {
  const lines = content.split('\n')
  return (
    <div className="space-y-1 text-sm leading-relaxed" style={{ color: 'var(--tx)' }}>
      {lines.map((line, i) => {
        if (line.startsWith('> ')) {
          return (
            <div key={i} className="rounded-lg px-3 py-1.5 border-s-2 border-purple-400 text-xs"
              style={{ background: 'rgba(124,58,237,.06)', color: 'var(--tx2)', fontStyle: 'italic' }}>
              {line.slice(2)}
            </div>
          )
        }
        return <p key={i} className="whitespace-pre-wrap">{line || <br />}</p>
      })}
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

export default function ThreadClient({ thread, replies: initialReplies, currentUserId, currentProfile, isAdmin, categoryId, isThreadAuthor }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [replies, setReplies] = useState(initialReplies)
  const [replyText, setReplyText] = useState('')
  const [quotedText, setQuotedText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [replyImage, setReplyImage] = useState<File | null>(null)
  const [replyImagePreview, setReplyImagePreview] = useState<string | null>(null)
  const replyFileRef = useRef<HTMLInputElement>(null)

  const refresh = () => { startTransition(() => { router.refresh() }) }

  const handleReplyImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) return
    setReplyImage(file)
    setReplyImagePreview(URL.createObjectURL(file))
  }

  const handleReplyPaste = (e: React.ClipboardEvent) => {
    const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'))
    const file = item?.getAsFile()
    if (file) handleReplyImageFile(file)
  }

  const removeReplyImage = () => {
    setReplyImage(null)
    setReplyImagePreview(null)
    if (replyFileRef.current) replyFileRef.current.value = ''
  }

  const handleReply = async () => {
    const full = quotedText ? `${quotedText}${replyText.trim()}` : replyText.trim()
    if (!full && !replyImage) return
    setIsSubmitting(true)
    try {
      let imageUrl: string | undefined
      if (replyImage) {
        const { signedUrl, publicUrl, error } = await getForumImageUploadUrl()
        if (!error && signedUrl && publicUrl) {
          await fetch(signedUrl, { method: 'PUT', body: replyImage, headers: { 'Content-Type': replyImage.type } })
          imageUrl = publicUrl
        }
      }
      await createReply(thread.id, categoryId, full || ' ', imageUrl)
      setReplyText('')
      setQuotedText('')
      setReplyImage(null)
      setReplyImagePreview(null)
      if (replyFileRef.current) replyFileRef.current.value = ''
      refresh()
    } finally {
      setIsSubmitting(false)
    }
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
    setEditingId(null)
    refresh()
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-5">

      {/* Original post */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--s1)', border: '1px solid var(--bd)' }}>
        <div className="flex items-start gap-4 p-5">
          <Avatar profile={thread.profiles} uid={thread.user_id} size={10} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm" style={{ color: 'var(--tx)' }}>{dName(thread.profiles)}</span>
                {(thread.profiles as any)?.role === 'admin' && (
                  <span className="rounded-md bg-pink-100 px-1.5 py-0.5 text-[10px] font-bold text-pink-600">מנהל</span>
                )}
              </div>
              <span className="text-xs" style={{ color: 'var(--tx3)' }}>{fmtDate(thread.created_at)}</span>
            </div>
            <div className="mt-3">
              <ContentBlock content={thread.content} />
              {thread.image_url && (
                <div className="mt-3">
                  <a href={thread.image_url} target="_blank" rel="noopener noreferrer">
                    <img src={thread.image_url} alt="" style={{ maxWidth: '100%', height: 'auto', borderRadius: '12px', display: 'block', cursor: 'zoom-in' }} />
                  </a>
                </div>
              )}
            </div>
            <div className="mt-3 flex items-center gap-2">
              {(thread.user_id === currentUserId || isAdmin) && (
                <button onClick={handleDeleteThread} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition hover:bg-red-50 hover:text-red-500" style={{ color: 'var(--tx3)' }}>
                  <Trash2 size={11} /> מחק נושא
                </button>
              )}
              {thread.user_id !== currentUserId && (
                <ReportButton contentType="forum_thread" contentId={thread.id}
                  buttonClassName="flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition hover:bg-red-50 hover:text-red-400" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Best answer callout */}
      {bestAnswer && (
        <div className="flex items-center gap-3 rounded-2xl px-5 py-3.5" style={{ background: 'rgba(16,185,129,.06)', border: '1px solid rgba(16,185,129,.2)' }}>
          <CheckCircle2 size={18} className="shrink-0 text-emerald-500" />
          <div className="min-w-0">
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

              return (
                <div
                  key={reply.id}
                  id={`reply-${reply.id}`}
                  className="rounded-2xl overflow-hidden"
                  style={{
                    background: reply.is_best_answer ? 'rgba(16,185,129,.04)' : 'var(--s1)',
                    border: reply.is_best_answer ? '1px solid rgba(16,185,129,.25)' : '1px solid var(--bd)',
                  }}
                >
                  <div className="flex items-start gap-3 p-4">
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <span className="text-xs font-bold" style={{ color: 'var(--tx3)' }}>#{idx + 1}</span>
                      <Avatar profile={reply.profiles} uid={reply.user_id} size={9} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm" style={{ color: 'var(--tx)' }}>{dName(reply.profiles)}</span>
                          {(reply.profiles as any)?.role === 'admin' && (
                            <span className="rounded-md bg-pink-100 px-1.5 py-0.5 text-[10px] font-bold text-pink-600">מנהל</span>
                          )}
                          {reply.is_best_answer && (
                            <span className="flex items-center gap-1 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
                              <CheckCircle2 size={9} /> הכי טוב
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {reply.edited_at && <span className="text-[10px] italic" style={{ color: 'var(--tx3)' }}>נערך</span>}
                          <span className="text-[11px]" style={{ color: 'var(--tx3)' }}>{fmtDate(reply.created_at)}</span>
                        </div>
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
                            <button onClick={() => handleEditSave(reply.id)} className="rounded-lg px-3 py-1.5 text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
                              שמור
                            </button>
                            <button onClick={() => setEditingId(null)} className="rounded-lg px-3 py-1.5 text-xs" style={{ color: 'var(--tx3)', border: '1px solid var(--bd)' }}>
                              ביטול
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <ContentBlock content={reply.content} />
                          {reply.image_url && (
                            <div className="mt-3">
                              <a href={reply.image_url} target="_blank" rel="noopener noreferrer">
                                <img src={reply.image_url} alt="" style={{ maxWidth: '100%', height: 'auto', borderRadius: '12px', display: 'block', cursor: 'zoom-in' }} />
                              </a>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions row */}
                  {!isEditing && (
                    <div className="flex items-center gap-1 px-4 py-2.5" style={{ borderTop: '1px solid var(--bd)', background: 'var(--inp)' }}>
                      {/* Like */}
                      <button
                        onClick={() => handleLike(reply.id)}
                        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition hover:scale-105"
                        style={{
                          background: reply.user_liked ? 'rgba(239,68,68,.1)' : undefined,
                          color: reply.user_liked ? '#ef4444' : 'var(--tx3)',
                          border: reply.user_liked ? '1px solid rgba(239,68,68,.25)' : '1px solid var(--bd)',
                        }}
                      >
                        <Heart size={12} className={reply.user_liked ? 'fill-current' : ''} />
                        {reply.like_count && reply.like_count > 0 ? reply.like_count : ''}
                      </button>

                      {/* Quote */}
                      <button
                        onClick={() => handleQuote(reply)}
                        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition hover:bg-slate-100"
                        style={{ color: 'var(--tx3)', border: '1px solid var(--bd)' }}
                      >
                        <CornerUpLeft size={11} /> ציטוט
                      </button>

                      {/* Best answer (thread author or admin) */}
                      {(isThreadAuthor || isAdmin) && (
                        <button
                          onClick={() => handleBestAnswer(reply.id)}
                          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition"
                          style={{
                            background: reply.is_best_answer ? 'rgba(16,185,129,.1)' : undefined,
                            color: reply.is_best_answer ? '#059669' : 'var(--tx3)',
                            border: reply.is_best_answer ? '1px solid rgba(16,185,129,.25)' : '1px solid var(--bd)',
                          }}
                        >
                          <CheckCircle2 size={11} /> {reply.is_best_answer ? 'בטל ✓' : 'הכי טוב'}
                        </button>
                      )}

                      <div className="ms-auto flex gap-1">
                        {/* Edit (own only) */}
                        {isOwn && (
                          <button
                            onClick={() => { setEditingId(reply.id); setEditText(reply.content) }}
                            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs transition hover:bg-amber-50"
                            style={{ color: 'var(--tx3)', border: '1px solid var(--bd)' }}
                          >
                            <Edit2 size={11} />
                          </button>
                        )}
                        {/* Delete (own or admin) */}
                        {(isOwn || isAdmin) && (
                          <button
                            onClick={() => handleDeleteReply(reply.id)}
                            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs transition hover:bg-red-50 hover:text-red-500"
                            style={{ color: 'var(--tx3)', border: '1px solid var(--bd)' }}
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                        {/* Report (other users only) */}
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
        </div>
      )}

      {/* Reply form */}
      {!thread.is_locked && (
        <div id="reply-form" className="rounded-2xl p-5" style={{ background: 'var(--s1)', border: '1px solid var(--bd)' }}>
          <h3 className="mb-3 text-sm font-bold" style={{ color: 'var(--tx)' }}>הוסף תגובה</h3>
          {quotedText && (
            <div className="mb-3 flex items-start gap-2 rounded-xl px-3 py-2 border-s-2 border-purple-400" style={{ background: 'rgba(124,58,237,.06)' }}>
              <CornerUpLeft size={13} className="mt-0.5 shrink-0 text-purple-500" />
              <p className="flex-1 truncate text-xs italic" style={{ color: 'var(--tx3)' }}>{quotedText.split('\n').find(l => l.startsWith('> **')) ?? ''}</p>
              <button onClick={() => setQuotedText('')} className="shrink-0" style={{ color: 'var(--tx3)' }}>✕</button>
            </div>
          )}
          <div onPaste={handleReplyPaste}>
            <textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); handleReply() } }}
              rows={4}
              placeholder="כתוב תגובה... (Ctrl+Enter לשליחה)"
              className="w-full resize-none rounded-xl px-4 py-2.5 text-sm outline-none transition placeholder:text-slate-400"
              style={{ background: 'var(--inp)', border: '1px solid var(--bd)', color: 'var(--tx)' }}
            />
          </div>

          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => replyFileRef.current?.click()}
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition hover:opacity-80"
              style={{ background: 'var(--inp)', border: '1px solid var(--bd)', color: 'var(--tx3)' }}
            >
              <ImageIcon size={13} />
              הוסף תמונה
            </button>
            <span className="text-xs" style={{ color: 'var(--tx3)' }}>או הדבק תמונה (Ctrl+V)</span>
            <input
              ref={replyFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleReplyImageFile(f) }}
            />
          </div>

          {replyImagePreview && (
            <div className="relative mt-2 inline-block">
              <img
                src={replyImagePreview}
                alt=""
                style={{ maxWidth: '100%', maxHeight: '200px', height: 'auto', borderRadius: '12px', display: 'block' }}
              />
              <button
                onClick={removeReplyImage}
                className="absolute end-2 top-2 rounded-full p-1 transition hover:opacity-80"
                style={{ background: 'rgba(0,0,0,.65)', color: 'white' }}
              >
                <X size={12} />
              </button>
            </div>
          )}

          <div className="mt-3">
            <button
              onClick={handleReply}
              disabled={(!replyText.trim() && !quotedText && !replyImage) || isSubmitting}
              className="rounded-xl px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}
            >
              {isSubmitting ? 'שולח...' : 'שלח תגובה'}
            </button>
          </div>
        </div>
      )}
      {thread.is_locked && (
        <div className="rounded-2xl px-5 py-4 text-center text-sm" style={{ background: 'var(--inp)', border: '1px solid var(--bd)', color: 'var(--tx3)' }}>
          🔒 נושא זה נעול — לא ניתן להוסיף תגובות
        </div>
      )}
    </div>
  )
}

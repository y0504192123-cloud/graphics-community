'use client'

import { useActionState, useTransition, useRef, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight, MessageSquare, Trash2, Tag } from 'lucide-react'
import type { InspirationPost, InspirationComment } from '@/types'

type Props = {
  post: InspirationPost
  comments: InspirationComment[]
  currentUserId: string
  addComment: (prev: { error?: string } | null, fd: FormData) => Promise<{ error?: string } | null>
  deleteComment: (id: string) => Promise<void>
}

export default function PostClient({ post, comments, currentUserId, addComment, deleteComment }: Props) {
  const [state, formAction, pending] = useActionState(addComment, null)
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)
  const prevPendingRef = useRef(false)

  useEffect(() => {
    if (prevPendingRef.current && !pending && state === null) {
      formRef.current?.reset()
    }
    prevPendingRef.current = pending
  }, [pending, state])

  const author = post.profiles
  const displayName = author?.full_name ?? author?.username ?? 'גרפיקאי'

  return (
    <div className="min-h-full" style={{ background: 'var(--bg)' }}>
      <div className="mx-auto max-w-4xl px-6 py-8">

        {/* Back */}
        <Link
          href="/inspiration"
          className="mb-6 flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-300"
        >
          <ArrowRight size={15} />
          חזרה לספריית ההשראה
        </Link>

        {/* Image */}
        <div className="mb-6 overflow-hidden rounded-2xl" style={{ border: '1px solid var(--bd)' }}>
          <img
            src={post.image_url}
            alt={post.title}
            className="max-h-[600px] w-full object-contain"
            style={{ background: 'var(--inp)' }}
          />
        </div>

        {/* Details */}
        <div className="mb-8 rounded-2xl p-6" style={{ background: 'var(--s2)', border: '1px solid var(--bd)' }}>
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">{post.title}</h1>
              {post.category && (
                <span
                  className="mt-1.5 inline-block rounded-full px-3 py-0.5 text-xs font-semibold text-purple-300"
                  style={{ background: 'rgba(124,58,237,.15)', border: '1px solid rgba(124,58,237,.3)' }}
                >
                  {post.category}
                </span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1.5 text-sm text-slate-500">
              <MessageSquare size={14} />
              {comments.length}
            </div>
          </div>

          {post.description && (
            <p className="mb-4 text-sm leading-relaxed text-slate-400">{post.description}</p>
          )}

          {post.tags && post.tags.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-1.5">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-slate-400"
                  style={{ background: 'var(--inp)', border: '1px solid var(--bd)' }}
                >
                  <Tag size={10} />
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Author */}
          <div className="flex items-center gap-3 border-t pt-4" style={{ borderColor: 'var(--bd)' }}>
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}
            >
              {displayName[0].toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-slate-200">{displayName}</p>
              <p className="text-xs text-slate-500">
                {author?.city && `${author.city} · `}
                {author?.specialization ?? 'גרפיקאי'}
              </p>
            </div>
            <p className="text-xs text-slate-600" dir="ltr">
              {new Date(post.created_at).toLocaleDateString('he-IL')}
            </p>
          </div>
        </div>

        {/* Comments */}
        <div>
          <h2 className="mb-4 text-lg font-bold text-white">
            תגובות ושאלות ({comments.length})
          </h2>

          <div className="mb-6 space-y-3">
            {comments.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-600">אין תגובות עדיין — היו ראשונים להגיב!</p>
            ) : (
              comments.map((comment) => {
                const cAuthor = comment.profiles
                const cName = cAuthor?.full_name ?? cAuthor?.username ?? 'גרפיקאי'
                return (
                  <div
                    key={comment.id}
                    className="flex gap-3 rounded-xl p-4"
                    style={{ background: 'var(--s2)', border: '1px solid var(--bd)' }}
                  >
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}
                    >
                      {cName[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-200">{cName}</span>
                        <span className="text-[11px] text-slate-600">
                          {new Date(comment.created_at).toLocaleDateString('he-IL')}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed text-slate-400">{comment.content}</p>
                    </div>
                    {(comment.user_id === currentUserId || post.user_id === currentUserId) && (
                      <button
                        disabled={isPending}
                        onClick={() => startTransition(async () => { await deleteComment(comment.id) })}
                        className="shrink-0 self-start rounded-lg p-1 text-slate-600 transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Add comment form */}
          <form
            ref={formRef}
            action={formAction}
            className="rounded-2xl p-5"
            style={{ background: 'var(--s2)', border: '1px solid var(--bd)' }}
          >
            {state?.error && (
              <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{state.error}</p>
            )}
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-500">
              הוסף תגובה
            </label>
            <textarea
              name="content"
              required
              rows={3}
              className="w-full resize-none rounded-xl border bg-white/[0.04] px-4 py-2.5 text-sm text-slate-100 outline-none transition-all focus:bg-white/[0.06] focus:ring-2 focus:ring-purple-500/20"
              style={{ borderColor: 'rgba(124,58,237,.3)' }}
            />
            <button
              type="submit"
              disabled={pending}
              className="mt-3 rounded-xl px-5 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
            >
              {pending ? 'שולח...' : 'פרסם תגובה'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

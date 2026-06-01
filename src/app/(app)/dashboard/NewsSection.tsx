'use client'

import { useState, useActionState } from 'react'
import { Newspaper, Plus, X, Clock } from 'lucide-react'
import type { NewsItem } from '@/types'

type Props = {
  news: NewsItem[]
  isAdmin: boolean
  publishNews: (prev: { error?: string } | null, formData: FormData) => Promise<{ error?: string } | null>
}

const inputCls = 'w-full rounded-xl border bg-white/[0.04] px-4 py-2.5 text-sm text-slate-100 outline-none transition-all placeholder:text-slate-600 focus:bg-white/[0.06] focus:ring-2 focus:ring-purple-500/20'

export default function NewsSection({ news, isAdmin, publishNews }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [state, action, pending] = useActionState(publishNews, null)

  if (state !== null && !state?.error && showForm) {
    setShowForm(false)
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Newspaper size={18} className="text-purple-400" />
          <h2 className="text-lg font-bold text-white">חדשות הקהילה</h2>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowForm((s) => !s)}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
          >
            {showForm ? <X size={13} /> : <Plus size={13} />}
            {showForm ? 'ביטול' : 'פרסם חדשות'}
          </button>
        )}
      </div>

      {/* Admin publish form */}
      {isAdmin && showForm && (
        <form
          action={action}
          className="mb-6 animate-fade-up rounded-2xl p-5"
          style={{ background: 'rgba(124,58,237,.06)', border: '1px solid rgba(124,58,237,.2)' }}
        >
          <h3 className="mb-4 text-sm font-bold text-purple-300">פרסום עדכון חדש</h3>
          {state?.error && (
            <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{state.error}</p>
          )}
          <div className="space-y-3">
            <input
              name="title"
              required
              placeholder="כותרת העדכון"
              className={inputCls}
              style={{ borderColor: 'rgba(124,58,237,.3)' }}
            />
            <textarea
              name="content"
              required
              rows={3}
              placeholder="תוכן ההודעה..."
              className={`${inputCls} resize-none`}
              style={{ borderColor: 'rgba(124,58,237,.3)' }}
            />
            <input
              name="image_url"
              type="url"
              placeholder="קישור לתמונה (אופציונלי)"
              className={inputCls}
              style={{ borderColor: 'rgba(124,58,237,.3)' }}
              dir="ltr"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="mt-4 rounded-xl px-5 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
          >
            {pending ? 'מפרסם...' : 'פרסם עדכון'}
          </button>
        </form>
      )}

      {/* News feed */}
      {news.length === 0 ? (
        <div
          className="flex flex-col items-center gap-3 rounded-2xl py-12 text-center"
          style={{ border: '2px dashed var(--bd)', background: 'var(--inp)' }}
        >
          <Newspaper size={28} className="text-slate-600" />
          <p className="text-sm text-slate-500">אין עדכונים עדיין</p>
        </div>
      ) : (
        <div className="space-y-4">
          {news.map((item) => (
            <article
              key={item.id}
              className="overflow-hidden rounded-2xl transition-all duration-300 hover:translate-y-[-1px]"
              style={{ background: 'var(--s2)', border: '1px solid var(--bd)', boxShadow: '0 2px 12px rgba(0,0,0,.2)' }}
            >
              {item.image_url && (
                <div className="aspect-[21/9] w-full overflow-hidden">
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                </div>
              )}
              <div className="p-5">
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs font-bold text-purple-300"
                    style={{ background: 'rgba(124,58,237,.15)' }}
                  >
                    📢 עדכון קהילה
                  </span>
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <Clock size={10} />
                    {new Date(item.created_at).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.content}</p>
                {item.profiles?.full_name && (
                  <p className="mt-3 text-xs text-slate-600">
                    — {item.profiles.full_name}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

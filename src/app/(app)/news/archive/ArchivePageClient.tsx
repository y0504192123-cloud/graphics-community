'use client'

import { useState } from 'react'
import { X, Clock, CalendarX, Archive } from 'lucide-react'
import Link from 'next/link'
import type { NewsItem, NewsCategory } from '@/types'

function CategoryBadge({ cat }: { cat?: NewsCategory | null }) {
  if (!cat) return null
  return (
    <span className="rounded-full px-2.5 py-1 text-xs font-black"
      style={{ background: cat.color + '33', color: cat.color, border: `1px solid ${cat.color}55` }}>
      {cat.name}
    </span>
  )
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })
}

function ArticleModal({ item, onClose }: { item: NewsItem; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-10 lg:pt-16"
      style={{ background: 'rgba(0,0,0,.8)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <article
        className="relative mb-16 w-full max-w-2xl overflow-hidden rounded-3xl"
        style={{ background: 'var(--s1)', border: '1px solid var(--bd)', boxShadow: '0 32px 80px rgba(0,0,0,.5)' }}
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose}
          className="absolute end-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full transition hover:opacity-80"
          style={{ background: 'rgba(0,0,0,.55)', color: '#fff' }}>
          <X size={16} />
        </button>
        {item.image_url && (
          <div className="aspect-[21/9] overflow-hidden">
            <img src={item.image_url} alt={item.title} className="h-full w-full object-cover opacity-75" />
          </div>
        )}
        <div className="p-6 lg:p-8">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full px-2.5 py-0.5 text-xs font-bold"
              style={{ background: 'rgba(107,114,128,.15)', color: '#9ca3af' }}>ארכיון</span>
            <CategoryBadge cat={item.news_categories} />
          </div>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--tx3)' }}>
              <Clock size={12} />{fmtDate(item.created_at)}
            </span>
            {item.expires_at && (
              <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--tx3)' }}>
                <CalendarX size={11} />פג תוקף: {fmtDate(item.expires_at)}
              </span>
            )}
          </div>
          <h1 className="mb-5 text-2xl font-black leading-tight" style={{ color: 'var(--tx)' }}>{item.title}</h1>
          <p className="whitespace-pre-line text-base leading-relaxed" style={{ color: 'var(--tx2)' }}>{item.content}</p>
          {item.profiles?.full_name && (
            <p className="mt-6 border-t pt-4 text-sm" style={{ borderColor: 'var(--bd)', color: 'var(--tx3)' }}>
              פורסם ע&quot;י {item.profiles.full_name}
            </p>
          )}
        </div>
      </article>
    </div>
  )
}

export default function ArchivePageClient({ newsItems }: { newsItems: NewsItem[] }) {
  const [selected, setSelected] = useState<NewsItem | null>(null)

  return (
    <div className="min-h-full" style={{ background: 'var(--bg)' }}>
      <div className="mx-auto max-w-5xl px-4 py-8 lg:px-8">

        {/* Header */}
        <div className="mb-7">
          <div className="mb-1 flex items-center gap-2 text-sm">
            <Link href="/dashboard" className="transition hover:opacity-70" style={{ color: 'var(--tx3)' }}>דף הבית</Link>
            <span style={{ color: 'var(--tx3)' }}>/</span>
            <Link href="/news" className="transition hover:opacity-70" style={{ color: 'var(--tx3)' }}>חדשות</Link>
            <span style={{ color: 'var(--tx3)' }}>/</span>
            <span className="font-semibold" style={{ color: 'var(--tx)' }}>ארכיון</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: 'rgba(107,114,128,.12)', border: '1px solid rgba(107,114,128,.2)' }}>
              <Archive size={16} style={{ color: 'var(--tx3)' }} />
            </div>
            <div>
              <h1 className="text-2xl font-black" style={{ color: 'var(--tx)' }}>ארכיון חדשות</h1>
              <p className="text-xs" style={{ color: 'var(--tx3)' }}>{newsItems.length} פריטים</p>
            </div>
          </div>
        </div>

        {newsItems.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-3xl py-24 text-center"
            style={{ border: '2px dashed var(--bd)', background: 'var(--inp)' }}>
            <Archive size={36} style={{ color: 'var(--tx3)' }} />
            <p className="font-semibold" style={{ color: 'var(--tx2)' }}>הארכיון ריק</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {newsItems.map(item => (
              <article
                key={item.id}
                onClick={() => setSelected(item)}
                className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl transition-all hover:translate-y-[-2px] hover:shadow-lg"
                style={{ background: 'var(--s1)', border: '1px solid var(--bd)', opacity: 0.85 }}
              >
                {/* Image */}
                <div className="relative aspect-[16/9] shrink-0 overflow-hidden">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.title}
                      className="h-full w-full object-cover grayscale-[30%] transition-all duration-500 group-hover:grayscale-0 group-hover:scale-105" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg,rgba(55,65,81,.4),rgba(75,85,99,.3))' }}>
                      <span className="text-4xl opacity-20">📰</span>
                    </div>
                  )}
                  {/* Archive ribbon */}
                  <div className="absolute end-0 top-3">
                    <span className="rounded-s-full px-2.5 py-0.5 text-[10px] font-bold"
                      style={{ background: 'rgba(107,114,128,.8)', color: '#fff' }}>ארכיון</span>
                  </div>
                  <div className="absolute bottom-3 start-3">
                    <CategoryBadge cat={item.news_categories} />
                  </div>
                </div>

                {/* Body */}
                <div className="flex flex-1 flex-col p-4">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--tx3)' }}>
                      <Clock size={10} />{fmtDate(item.created_at)}
                    </span>
                    {item.expires_at && (
                      <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--tx3)' }}>
                        <CalendarX size={10} />פג: {fmtDate(item.expires_at)}
                      </span>
                    )}
                  </div>
                  <h3 className="line-clamp-2 font-black leading-snug" style={{ color: 'var(--tx)', fontSize: '0.95rem' }}>
                    {item.title}
                  </h3>
                  <p className="mt-1.5 line-clamp-2 flex-1 text-sm leading-relaxed" style={{ color: 'var(--tx2)' }}>
                    {item.content}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {selected && <ArticleModal item={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

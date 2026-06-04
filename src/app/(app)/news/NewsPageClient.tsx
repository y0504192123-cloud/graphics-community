'use client'

import { useState } from 'react'
import { X, Clock, Archive, CalendarX } from 'lucide-react'
import Link from 'next/link'
import type { NewsItem, NewsCategory } from '@/types'

// ── Shared helpers ────────────────────────────────────────────────────────────

function CategoryBadge({ cat }: { cat?: NewsCategory | null }) {
  if (!cat) return null
  return (
    <span className="rounded-full px-2.5 py-1 text-xs font-black uppercase tracking-wide"
      style={{ background: cat.color, color: '#fff', letterSpacing: '0.04em' }}>
      {cat.name}
    </span>
  )
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })
}

function ExpiryBadge({ expiresAt }: { expiresAt: string | null }) {
  if (!expiresAt) return null
  const soon = new Date(expiresAt).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000
  return (
    <span className="flex items-center gap-1 text-[11px] font-medium"
      style={{ color: soon ? '#f59e0b' : 'var(--tx3)' }}>
      <CalendarX size={10} />
      בתוקף עד {fmtDate(expiresAt)}
    </span>
  )
}

// ── Hero card ─────────────────────────────────────────────────────────────────

function HeroCard({ item, onClick }: { item: NewsItem; onClick: () => void }) {
  return (
    <article
      onClick={onClick}
      className="group mb-8 cursor-pointer overflow-hidden rounded-2xl transition-all duration-300 hover:shadow-2xl"
      style={{ background: 'var(--s1)', border: '1px solid var(--bd)' }}
    >
      {/* Image */}
      <div className="relative aspect-[21/9] overflow-hidden">
        {item.image_url ? (
          <img src={item.image_url} alt={item.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="h-full w-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81,#4c1d95)' }}>
            <span className="text-7xl opacity-20">📰</span>
          </div>
        )}
        {/* Gradient overlay */}
        <div className="pointer-events-none absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,.7) 0%, rgba(0,0,0,.1) 60%, transparent 100%)' }} />
        {/* Badge overlaid */}
        <div className="absolute bottom-4 start-4">
          <CategoryBadge cat={item.news_categories} />
        </div>
      </div>

      {/* Body */}
      <div className="p-6 lg:p-8">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--tx3)' }}>
            <Clock size={12} />{fmtDate(item.created_at)}
          </span>
          <ExpiryBadge expiresAt={item.expires_at ?? null} />
        </div>
        <h2 className="mb-3 text-2xl font-black leading-tight lg:text-3xl" style={{ color: 'var(--tx)', lineHeight: 1.25 }}>
          {item.title}
        </h2>
        <p className="line-clamp-3 text-base leading-relaxed" style={{ color: 'var(--tx2)' }}>{item.content}</p>
        <div className="mt-5 flex items-center gap-1.5">
          <span className="text-sm font-black" style={{ color: '#7c3aed' }}>קרא עוד</span>
          <span className="text-sm font-black" style={{ color: '#7c3aed' }}>←</span>
        </div>
      </div>
    </article>
  )
}

// ── News card ─────────────────────────────────────────────────────────────────

function NewsCard({ item, onClick }: { item: NewsItem; onClick: () => void }) {
  return (
    <article
      onClick={onClick}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl transition-all duration-300 hover:translate-y-[-3px] hover:shadow-xl"
      style={{ background: 'var(--s1)', border: '1px solid var(--bd)' }}
    >
      {/* Image */}
      <div className="relative aspect-[16/9] shrink-0 overflow-hidden">
        {item.image_url ? (
          <img src={item.image_url} alt={item.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="h-full w-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81,#4c1d95)' }}>
            <span className="text-4xl opacity-20">📰</span>
          </div>
        )}
        <div className="absolute bottom-3 start-3">
          <CategoryBadge cat={item.news_categories} />
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-[11px] font-medium" style={{ color: 'var(--tx3)' }}>
            <Clock size={10} />{fmtDate(item.created_at)}
          </span>
        </div>
        <h3 className="mb-2 line-clamp-2 font-black leading-snug" style={{ color: 'var(--tx)', fontSize: '1rem', lineHeight: 1.3 }}>
          {item.title}
        </h3>
        <p className="line-clamp-2 flex-1 text-sm leading-relaxed" style={{ color: 'var(--tx2)' }}>
          {item.content}
        </p>
        {item.expires_at && (
          <div className="mt-3 border-t pt-2.5" style={{ borderColor: 'var(--bd)' }}>
            <ExpiryBadge expiresAt={item.expires_at} />
          </div>
        )}
      </div>
    </article>
  )
}

// ── Article modal ─────────────────────────────────────────────────────────────

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
            <img src={item.image_url} alt={item.title} className="h-full w-full object-cover" />
          </div>
        )}

        <div className="p-6 lg:p-8">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <CategoryBadge cat={item.news_categories} />
            <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--tx3)' }}>
              <Clock size={12} />{fmtDate(item.created_at)}
            </span>
            <ExpiryBadge expiresAt={item.expires_at ?? null} />
          </div>
          <h1 className="mb-5 text-2xl font-black leading-tight" style={{ color: 'var(--tx)', lineHeight: 1.25 }}>
            {item.title}
          </h1>
          <p className="whitespace-pre-line text-base leading-relaxed" style={{ color: 'var(--tx2)' }}>
            {item.content}
          </p>
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

// ── Main component ────────────────────────────────────────────────────────────

export default function NewsPageClient({
  newsItems,
  archiveCount = 0,
}: {
  newsItems: NewsItem[]
  archiveCount?: number
}) {
  const [selected, setSelected] = useState<NewsItem | null>(null)
  const [hero, ...rest] = newsItems

  return (
    <div className="min-h-full" style={{ background: 'var(--bg)' }}>
      <div className="mx-auto max-w-5xl px-4 py-8 lg:px-8">

        {/* Header */}
        <div className="mb-7 flex items-center justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-sm">
              <Link href="/dashboard" className="transition hover:opacity-70" style={{ color: 'var(--tx3)' }}>דף הבית</Link>
              <span style={{ color: 'var(--tx3)' }}>/</span>
              <span className="font-semibold" style={{ color: 'var(--tx)' }}>חדשות</span>
            </div>
            <h1 className="text-2xl font-black" style={{ color: 'var(--tx)' }}>חדשות מעולם הגרפיקה</h1>
          </div>
          {archiveCount > 0 && (
            <Link href="/news/archive"
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition hover:opacity-80"
              style={{ background: 'var(--s1)', border: '1px solid var(--bd)', color: 'var(--tx2)' }}>
              <Archive size={13} />
              ארכיון ({archiveCount})
            </Link>
          )}
        </div>

        {newsItems.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-3xl py-24 text-center"
            style={{ border: '2px dashed var(--bd)', background: 'var(--inp)' }}>
            <span className="text-5xl">📰</span>
            <p className="font-semibold" style={{ color: 'var(--tx2)' }}>אין חדשות פעילות כרגע</p>
            {archiveCount > 0 && (
              <Link href="/news/archive" className="text-sm font-bold transition hover:opacity-80"
                style={{ color: '#7c3aed' }}>
                לארכיון החדשות →
              </Link>
            )}
          </div>
        ) : (
          <>
            <HeroCard item={hero} onClick={() => setSelected(hero)} />

            {rest.length > 0 && (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map(item => (
                  <NewsCard key={item.id} item={item} onClick={() => setSelected(item)} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {selected && <ArticleModal item={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

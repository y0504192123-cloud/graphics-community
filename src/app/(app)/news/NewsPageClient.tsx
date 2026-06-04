'use client'

import { useState } from 'react'
import { X, Clock, Archive, CalendarX } from 'lucide-react'
import Link from 'next/link'
import type { NewsItem, NewsCategory } from '@/types'

function CategoryBadge({ cat }: { cat?: NewsCategory | null }) {
  if (!cat) return null
  return (
    <span className="rounded-full px-2.5 py-0.5 text-xs font-black"
      style={{ background: cat.color + '22', color: cat.color, border: `1px solid ${cat.color}44` }}>
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

// ── Hero ──────────────────────────────────────────────────────────────────────
// RTL flex-row: order-1 = rightmost (text), order-2 = leftmost (image)
// Mobile flex-col: order-1 = top (image), order-2 = bottom (text)

function HeroCard({ item, onClick }: { item: NewsItem; onClick: () => void }) {
  return (
    <article
      onClick={onClick}
      className="group mb-6 flex cursor-pointer flex-col overflow-hidden rounded-2xl transition-all duration-300 hover:shadow-2xl lg:flex-row"
      style={{ background: 'var(--s1)', border: '1px solid var(--bd)' }}
    >
      {/* Text — right on desktop */}
      <div className="order-2 flex flex-1 flex-col justify-center p-6 lg:order-1 lg:p-8">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <CategoryBadge cat={item.news_categories} />
        </div>
        <h2 className="mb-3 text-2xl font-black lg:text-3xl" style={{ color: 'var(--tx)', lineHeight: 1.25 }}>
          {item.title}
        </h2>
        <p className="mb-4 line-clamp-4 text-base leading-relaxed" style={{ color: 'var(--tx2)' }}>{item.content}</p>
        <div className="mt-auto flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--tx3)' }}>
            <Clock size={12} />{fmtDate(item.created_at)}
          </span>
          <ExpiryBadge expiresAt={item.expires_at ?? null} />
        </div>
        <p className="mt-4 text-sm font-black" style={{ color: '#7c3aed' }}>קרא עוד ←</p>
      </div>
      {/* Image — left on desktop, no cropping */}
      <div className="order-1 shrink-0 overflow-hidden lg:order-2 lg:w-[55%]">
        {item.image_url ? (
          <img src={item.image_url} alt={item.title}
            className="transition-transform duration-500 group-hover:scale-[1.02]"
            style={{ width: '100%', height: 'auto', display: 'block' }} />
        ) : (
          <div className="flex items-center justify-center py-16" style={{ background: 'var(--inp)' }}>
            <span style={{ fontSize: '5rem', opacity: 0.12 }}>📰</span>
          </div>
        )}
      </div>
    </article>
  )
}

// ── Medium card ───────────────────────────────────────────────────────────────

function MediumCard({ item, onClick }: { item: NewsItem; onClick: () => void }) {
  return (
    <article
      onClick={onClick}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl transition-all duration-300 hover:translate-y-[-3px] hover:shadow-xl"
      style={{ background: 'var(--s1)', border: '1px solid var(--bd)' }}
    >
      <div className="relative overflow-hidden">
        {item.image_url ? (
          <img src={item.image_url} alt={item.title}
            className="transition-transform duration-500 group-hover:scale-[1.02]"
            style={{ width: '100%', height: 'auto', display: 'block' }} />
        ) : (
          <div className="flex items-center justify-center py-12" style={{ background: 'var(--inp)' }}>
            <span style={{ fontSize: '3rem', opacity: 0.12 }}>📰</span>
          </div>
        )}
        <div className="absolute bottom-2 start-2">
          <CategoryBadge cat={item.news_categories} />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-1.5 flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--tx3)' }}>
          <Clock size={10} />{fmtDate(item.created_at)}
        </div>
        <h3 className="line-clamp-2 font-black leading-snug" style={{ color: 'var(--tx)', fontSize: '1rem', lineHeight: 1.3 }}>
          {item.title}
        </h3>
        <p className="mt-1.5 line-clamp-3 flex-1 text-sm leading-relaxed" style={{ color: 'var(--tx2)' }}>
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

// ── Small card ────────────────────────────────────────────────────────────────

function SmallCard({ item, onClick }: { item: NewsItem; onClick: () => void }) {
  return (
    <article
      onClick={onClick}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-xl transition-all duration-300 hover:translate-y-[-2px] hover:shadow-lg"
      style={{ background: 'var(--s1)', border: '1px solid var(--bd)' }}
    >
      <div className="relative overflow-hidden">
        {item.image_url ? (
          <img src={item.image_url} alt={item.title}
            style={{ width: '100%', height: 'auto', display: 'block' }} />
        ) : (
          <div className="flex items-center justify-center py-8" style={{ background: 'var(--inp)' }}>
            <span style={{ fontSize: '2.5rem', opacity: 0.12 }}>📰</span>
          </div>
        )}
        <div className="absolute bottom-2 start-2">
          <CategoryBadge cat={item.news_categories} />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-3">
        <div className="mb-1 flex items-center gap-1 text-[10px]" style={{ color: 'var(--tx3)' }}>
          <Clock size={9} />{fmtDate(item.created_at)}
        </div>
        <h3 className="line-clamp-2 font-black leading-snug text-sm" style={{ color: 'var(--tx)' }}>
          {item.title}
        </h3>
        <p className="mt-1 line-clamp-2 flex-1 text-xs leading-relaxed" style={{ color: 'var(--tx2)' }}>
          {item.content}
        </p>
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
          <img src={item.image_url} alt={item.title}
            style={{ width: '100%', height: 'auto', display: 'block' }} />
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

// ── Main ──────────────────────────────────────────────────────────────────────

export default function NewsPageClient({
  newsItems,
  archiveCount = 0,
}: {
  newsItems: NewsItem[]
  archiveCount?: number
}) {
  const [selected, setSelected] = useState<NewsItem | null>(null)
  const [hero, second, third, ...rest] = newsItems

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
            {hero && <HeroCard item={hero} onClick={() => setSelected(hero)} />}

            {(second || third) && (
              <div className="mb-6 grid gap-5 sm:grid-cols-2">
                {second && <MediumCard item={second} onClick={() => setSelected(second)} />}
                {third && <MediumCard item={third} onClick={() => setSelected(third)} />}
              </div>
            )}

            {rest.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map(item => (
                  <SmallCard key={item.id} item={item} onClick={() => setSelected(item)} />
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

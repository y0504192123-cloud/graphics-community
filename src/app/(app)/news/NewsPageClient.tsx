'use client'

import { useState } from 'react'
import { X, Clock } from 'lucide-react'
import Link from 'next/link'
import type { NewsItem, NewsCategory } from '@/types'

function CategoryBadge({ cat, size = 'sm' }: { cat?: NewsCategory | null; size?: 'sm' | 'md' }) {
  if (!cat) return null
  const pad = size === 'md' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs'
  return (
    <span className={`rounded-full font-bold ${pad}`}
      style={{ background: cat.color + '22', color: cat.color, border: `1px solid ${cat.color}44` }}>
      {cat.name}
    </span>
  )
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function NewsPageClient({ newsItems }: { newsItems: NewsItem[] }) {
  const [selected, setSelected] = useState<NewsItem | null>(null)

  return (
    <div className="min-h-full" style={{ background: 'var(--bg)' }}>
      <div className="mx-auto max-w-5xl px-4 py-8 lg:px-8">

        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-sm">
          <Link href="/dashboard" className="transition hover:opacity-70" style={{ color: 'var(--tx3)' }}>דף הבית</Link>
          <span style={{ color: 'var(--tx3)' }}>/</span>
          <span className="font-semibold" style={{ color: 'var(--tx)' }}>חדשות</span>
        </div>

        <h1 className="mb-7 text-2xl font-black" style={{ color: 'var(--tx)' }}>חדשות מעולם הגרפיקה</h1>

        {newsItems.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-3xl py-24 text-center"
            style={{ border: '2px dashed var(--bd)', background: 'var(--inp)' }}>
            <span className="text-4xl">📰</span>
            <p className="text-sm" style={{ color: 'var(--tx3)' }}>אין חדשות עדיין</p>
          </div>
        ) : (
          <>
            {/* Hero */}
            {(() => {
              const hero = newsItems[0]
              return (
                <article
                  onClick={() => setSelected(hero)}
                  className="group mb-8 cursor-pointer overflow-hidden rounded-3xl transition-all hover:opacity-95"
                  style={{ background: 'var(--s1)', border: '1px solid var(--bd)', boxShadow: '0 4px 24px rgba(0,0,0,.15)' }}
                >
                  {hero.image_url ? (
                    <div className="aspect-[21/9] overflow-hidden">
                      <img src={hero.image_url} alt={hero.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    </div>
                  ) : (
                    <div className="aspect-[21/9] flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg,rgba(124,58,237,.08),rgba(109,40,217,.18))' }}>
                      <span className="text-6xl opacity-30">📰</span>
                    </div>
                  )}
                  <div className="p-6 lg:p-8">
                    <div className="mb-3 flex flex-wrap items-center gap-3">
                      <CategoryBadge cat={hero.news_categories} size="md" />
                      <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--tx3)' }}>
                        <Clock size={12} />{formatDate(hero.created_at)}
                      </span>
                    </div>
                    <h2 className="mb-3 text-2xl font-black leading-snug lg:text-3xl" style={{ color: 'var(--tx)' }}>
                      {hero.title}
                    </h2>
                    <p className="line-clamp-3 text-base leading-relaxed" style={{ color: 'var(--tx2)' }}>
                      {hero.content}
                    </p>
                    <span className="mt-4 inline-block text-sm font-bold" style={{ color: '#7c3aed' }}>קרא עוד ←</span>
                  </div>
                </article>
              )
            })()}

            {/* Cards grid */}
            {newsItems.length > 1 && (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {newsItems.slice(1).map(item => (
                  <article
                    key={item.id}
                    onClick={() => setSelected(item)}
                    className="group cursor-pointer overflow-hidden rounded-2xl transition-all hover:translate-y-[-2px]"
                    style={{ background: 'var(--s1)', border: '1px solid var(--bd)', boxShadow: '0 2px 12px rgba(0,0,0,.1)' }}
                  >
                    {item.image_url ? (
                      <div className="aspect-[16/9] overflow-hidden">
                        <img src={item.image_url} alt={item.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      </div>
                    ) : (
                      <div className="aspect-[16/9] flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg,rgba(124,58,237,.05),rgba(109,40,217,.12))' }}>
                        <span className="text-3xl opacity-25">📰</span>
                      </div>
                    )}
                    <div className="p-4">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <CategoryBadge cat={item.news_categories} />
                        <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--tx3)' }}>
                          <Clock size={10} />{formatDate(item.created_at)}
                        </span>
                      </div>
                      <h3 className="line-clamp-2 font-bold leading-snug" style={{ color: 'var(--tx)' }}>{item.title}</h3>
                      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed" style={{ color: 'var(--tx2)' }}>
                        {item.content}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Article modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-10 lg:pt-16"
          style={{ background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(6px)' }}
          onClick={() => setSelected(null)}
        >
          <article
            className="relative mb-10 w-full max-w-2xl overflow-hidden rounded-3xl"
            style={{ background: 'var(--s1)', border: '1px solid var(--bd)', boxShadow: '0 24px 60px rgba(0,0,0,.4)' }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setSelected(null)}
              className="absolute end-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full transition hover:opacity-80"
              style={{ background: 'rgba(0,0,0,.5)', color: '#fff' }}
            >
              <X size={16} />
            </button>

            {selected.image_url && (
              <div className="aspect-[21/9] overflow-hidden">
                <img src={selected.image_url} alt={selected.title} className="h-full w-full object-cover" />
              </div>
            )}

            <div className="p-6 lg:p-8">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <CategoryBadge cat={selected.news_categories} size="md" />
                <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--tx3)' }}>
                  <Clock size={12} />{formatDate(selected.created_at)}
                </span>
              </div>
              <h1 className="mb-5 text-2xl font-black leading-snug" style={{ color: 'var(--tx)' }}>
                {selected.title}
              </h1>
              <p className="whitespace-pre-line text-base leading-relaxed" style={{ color: 'var(--tx2)' }}>
                {selected.content}
              </p>
              {selected.profiles?.full_name && (
                <p className="mt-6 border-t pt-4 text-sm" style={{ borderColor: 'var(--bd)', color: 'var(--tx3)' }}>
                  פורסם ע&quot;י {selected.profiles.full_name}
                </p>
              )}
            </div>
          </article>
        </div>
      )}
    </div>
  )
}

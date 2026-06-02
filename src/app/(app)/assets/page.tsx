'use client'

import { useState, useEffect } from 'react'
import { Download, Package, Layers } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Asset, AssetCategory } from '@/types'

const typeIcons: Record<string, string> = {
  'פונטים': '🔤',
  'אייקונים': '⚡',
  'תמונות': '🖼️',
  'תבניות': '📄',
  'ברשים': '🖌️',
  'אלמנטים': '✦',
}

export default function AssetsPage() {
  const [assets, setAssets]       = useState<Asset[]>([])
  const [categories, setCategories] = useState<AssetCategory[]>([])
  const [filterCat, setFilterCat] = useState('הכל')
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('assets').select('*').order('created_at', { ascending: false }),
      supabase.from('assets_categories').select('*').order('name', { ascending: true }),
    ]).then(([assetsRes, catsRes]) => {
      setAssets((assetsRes.data ?? []) as Asset[])
      setCategories((catsRes.data ?? []) as AssetCategory[])
      setLoading(false)
    })
  }, [])

  const filtered = filterCat === 'הכל' ? assets : assets.filter((a) => a.category === filterCat)

  return (
    <div className="min-h-full" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <div className="relative overflow-hidden px-6 py-8" style={{ background: 'var(--hero)' }}>
        <div className="pointer-events-none absolute -top-20 end-0 h-60 w-60 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,.6) 0%, transparent 70%)', filter: 'blur(50px)' }} />
        <div className="grid-pattern absolute inset-0 opacity-40" />
        <div className="relative mx-auto max-w-5xl">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl"
              style={{ background: 'rgba(124,58,237,.1)', border: '1px solid rgba(124,58,237,.2)' }}>
              <Package size={22} className="text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold lg:text-3xl" style={{ color: 'var(--tx)' }}>חומרים לשימוש</h1>
              <p className="mt-0.5 text-sm" style={{ color: 'var(--tx2)' }}>פונטים, אייקונים, תמונות ואלמנטים לשימוש חינמי</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-6">

        {/* Category filter */}
        {categories.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {['הכל', ...categories.map((c) => c.name)].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCat(cat)}
                className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200"
                style={filterCat === cat
                  ? { background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: 'white', boxShadow: '0 2px 12px rgba(124,58,237,.4)' }
                  : { background: 'var(--inp)', border: '1px solid var(--bd)', color: 'var(--tx2)' }
                }
              >
                {cat !== 'הכל' && <span>{typeIcons[cat] ?? '•'}</span>}
                {cat}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center gap-5 rounded-3xl py-20 text-center"
            style={{ border: '2px dashed var(--bd)', background: 'white' }}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{ background: 'rgba(124,58,237,.08)', border: '1px solid rgba(124,58,237,.15)' }}>
              <Layers size={28} className="text-purple-400" />
            </div>
            <div>
              <p className="font-semibold" style={{ color: 'var(--tx2)' }}>אין חומרים עדיין</p>
              <p className="mt-1 text-sm" style={{ color: 'var(--tx3)' }}>
                {filterCat === 'הכל' ? 'הספרייה תתמלא בקרוב בחומרים שימושיים' : `אין חומרים בקטגוריה "${filterCat}"`}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((asset) => (
              <div
                key={asset.id}
                className="group overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
                style={{ background: 'white', border: '1px solid var(--bd)', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}
              >
                {/* Preview */}
                <div className="relative flex aspect-video items-center justify-center overflow-hidden"
                  style={{ background: 'var(--s2)' }}>
                  {asset.file_url ? (
                    <img src={asset.file_url} alt={asset.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <span className="text-5xl opacity-30">{typeIcons[asset.category ?? ''] ?? '📦'}</span>
                  )}
                  {asset.is_free && (
                    <span
                      className="absolute start-3 top-3 rounded-full px-2.5 py-0.5 text-xs font-bold text-emerald-700"
                      style={{ background: 'rgba(52,211,153,.15)', border: '1px solid rgba(52,211,153,.3)' }}
                    >
                      חינם
                    </span>
                  )}
                </div>

                <div className="p-4">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold" style={{ color: 'var(--tx)' }}>{asset.title}</h3>
                      {asset.description && (
                        <p className="mt-0.5 text-xs line-clamp-2" style={{ color: 'var(--tx3)' }}>{asset.description}</p>
                      )}
                    </div>
                    {asset.category && (
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={{ background: 'rgba(124,58,237,.08)', color: '#7c3aed', border: '1px solid rgba(124,58,237,.15)' }}
                      >
                        {asset.category}
                      </span>
                    )}
                  </div>

                  {asset.file_url && (
                    <a
                      href={asset.file_url}
                      download
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition-all hover:opacity-90"
                      style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: 'white' }}
                    >
                      <Download size={13} />
                      הורד
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

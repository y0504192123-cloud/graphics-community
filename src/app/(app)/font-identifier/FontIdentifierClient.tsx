'use client'

import React, { useState, useRef } from 'react'
import { ScanText, X, Search, ExternalLink, ImagePlus } from 'lucide-react'
import type { Font } from '@/types'

type IdentifyResult = {
  matches?: string[]
  scores?: number[]
  confident?: boolean
  description?: string
  error?: string
  debug?: string
}

type Props = {
  identifyFont: (imageBase64: string, imageMimeType: string) => Promise<IdentifyResult>
  fonts: Font[]
}

export default function FontIdentifierClient({ identifyFont, fonts }: Props) {
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile]       = useState<File | null>(null)
  const [identifying, setIdentifying]   = useState(false)
  const [result, setResult]             = useState<IdentifyResult | null>(null)
  const [showDebug, setShowDebug]       = useState(true)

  const [search, setSearch]         = useState('')
  const [filterCat, setFilterCat]   = useState('')
  const [filterFree, setFilterFree] = useState<'all' | 'free' | 'paid'>('all')

  const fileRef = useRef<HTMLInputElement>(null)

  const loadFile = (file: File) => {
    setImageFile(file)
    setResult(null)
    const reader = new FileReader()
    reader.onload = ev => setImagePreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const clearImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setResult(null)
  }

  const handleIdentify = async () => {
    if (!imageFile || !imagePreview || identifying) return
    setIdentifying(true)
    setResult(null)

    try {
      const [prefix, base64] = imagePreview.split(',')
      const mimeType = prefix.match(/data:([^;]+)/)?.[1] ?? 'image/jpeg'
      const res = await identifyFont(base64, mimeType)
      setResult(res)
    } catch (err) {
      setResult({ error: `שגיאת רשת: ${err}` })
    }
    setIdentifying(false)
  }

  const resultFonts = (result?.matches ?? []).map((name, i) => ({
    name,
    score: result?.scores?.[i] ?? 0,
    font: fonts.find(f => f.name === name) ?? null,
  }))

  const categories   = Array.from(new Set(fonts.map(f => f.category).filter(Boolean))) as string[]
  const filteredFonts = fonts.filter(f => {
    const q = search.toLowerCase()
    return (
      (!q || f.name.toLowerCase().includes(q) || (f.name_hebrew?.toLowerCase().includes(q) ?? false) || (f.company?.toLowerCase().includes(q) ?? false))
      && (!filterCat  || f.category === filterCat)
      && (filterFree === 'all' || (filterFree === 'free' && f.is_free) || (filterFree === 'paid' && !f.is_free))
    )
  })

  return (
    <div
      className="min-h-full overflow-y-auto"
      style={{ background: 'var(--bg)' }}
      onPaste={e => {
        const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'))
        if (!item) return
        e.preventDefault()
        const file = item.getAsFile()
        if (file) loadFile(file)
      }}
    >
      {/* ── Identification panel ── */}
      <div className="px-4 py-6 lg:px-8">
        <div className="mx-auto max-w-3xl">

          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
              <ScanText size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold" style={{ color: 'var(--tx)' }}>זיהוי פונט</h1>
              <p className="text-xs" style={{ color: 'var(--tx3)' }}>
                העלה תמונה עם טקסט עברי — Claude ישווה מול כל הפונטים במאגר
              </p>
            </div>
          </div>

          {/* Upload zone */}
          {!imagePreview ? (
            <div
              onClick={() => fileRef.current?.click()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('image/')) loadFile(f) }}
              onDragOver={e => e.preventDefault()}
              className="flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl py-14 text-center transition-all hover:opacity-80"
              style={{ border: '2px dashed rgba(124,58,237,.35)', background: 'rgba(124,58,237,.04)' }}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{ background: 'rgba(124,58,237,.1)' }}>
                <ImagePlus size={24} className="text-purple-400" />
              </div>
              <div>
                <p className="font-semibold" style={{ color: 'var(--tx)' }}>גרור תמונה לכאן או לחץ לבחירה</p>
                <p className="mt-1 text-sm" style={{ color: 'var(--tx3)' }}>PNG, JPG, WebP · Ctrl+V להדבקה</p>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl" style={{ border: '1px solid var(--bd)' }}>
              {/* Image preview */}
              <div className="flex justify-center" style={{ background: '#f5f5f5', maxHeight: 360, overflow: 'hidden' }}>
                <img
                  src={imagePreview}
                  alt=""
                  draggable={false}
                  style={{ maxWidth: '100%', maxHeight: 360, objectFit: 'contain', display: 'block' }}
                />
              </div>

              {/* Controls bar */}
              <div className="flex items-center justify-between gap-3 px-4 py-3"
                style={{ background: 'var(--s1)', borderTop: '1px solid var(--bd)' }}>
                <span className="truncate text-xs" style={{ color: 'var(--tx2)' }}>{imageFile?.name}</span>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={handleIdentify}
                    disabled={identifying}
                    className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}
                  >
                    <ScanText size={14} />
                    {identifying ? 'מזהה...' : 'זהה פונט'}
                  </button>
                  <button
                    onClick={clearImage}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition hover:opacity-70"
                    style={{ background: 'var(--inp)', border: '1px solid var(--bd)', color: 'var(--tx3)' }}
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Loading */}
          {identifying && (
            <div className="mt-5 flex flex-col items-center gap-3 rounded-2xl p-8"
              style={{ background: 'var(--s1)', border: '1px solid var(--bd)' }}>
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
              <p className="text-sm font-medium" style={{ color: 'var(--tx2)' }}>
                Claude משווה מול כל הפונטים במאגר...
              </p>
              <p className="text-xs" style={{ color: 'var(--tx3)' }}>עלול לקחת 20–60 שניות</p>
            </div>
          )}

          {/* Results */}
          {result && !identifying && (
            <div className="mt-5 rounded-2xl p-5" style={{ background: 'var(--s1)', border: '1px solid var(--bd)' }}>
              {result.error ? (
                <p className="text-sm text-red-400">{result.error}</p>
              ) : (
                <>
                  {result.description && (
                    <p className="mb-4 text-sm" style={{ color: 'var(--tx2)' }}>{result.description}</p>
                  )}
                  <p className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--tx3)' }}>
                    {resultFonts.length > 0
                      ? `${resultFonts.length} פונטים דומים ביותר`
                      : 'לא נמצאו תוצאות'}
                    {result.confident && (
                      <span className="mr-2 font-bold" style={{ color: '#059669' }}> · זיהוי בטוח</span>
                    )}
                  </p>
                  <div className="space-y-2">
                    {resultFonts.map(({ name, score, font }, i) => (
                      <FontResultRow key={name} font={font} name={name} rank={i + 1} score={score} />
                    ))}
                    {resultFonts.length === 0 && (
                      <p className="text-sm" style={{ color: 'var(--tx3)' }}>
                        נסה תמונה אחרת עם טקסט עברי ברור יותר.
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* Debug log */}
              {result.debug && (
                <div className="mt-4 border-t pt-4" style={{ borderColor: 'var(--bd)' }}>
                  <button
                    onClick={() => setShowDebug(v => !v)}
                    className="text-xs font-mono transition hover:opacity-70"
                    style={{ color: 'var(--tx3)' }}
                  >
                    {showDebug ? '▲ הסתר debug' : '▼ הצג debug log'}
                  </button>
                  {showDebug && (
                    <pre
                      className="mt-2 overflow-x-auto rounded-xl p-3 text-[11px] leading-relaxed font-mono"
                      style={{ background: 'var(--inp)', color: 'var(--tx2)', whiteSpace: 'pre-wrap', direction: 'ltr', textAlign: 'left' }}
                    >
                      {result.debug}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 lg:mx-8" style={{ borderTop: '1px solid var(--bd)' }} />

      {/* ── Font gallery ── */}
      <div className="px-4 py-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold" style={{ color: 'var(--tx)' }}>מאגר הפונטים</h2>
              <p className="text-xs" style={{ color: 'var(--tx3)' }}>{fonts.length} פונטים</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search size={13} className="absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--tx3)' }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="חפש פונט..."
                  className="rounded-xl py-2 pe-3 ps-8 text-sm outline-none"
                  style={{ background: 'var(--inp)', border: '1px solid var(--bd)', color: 'var(--tx)', width: '160px' }}
                />
              </div>
              {categories.length > 0 && (
                <select
                  value={filterCat}
                  onChange={e => setFilterCat(e.target.value)}
                  className="rounded-xl px-3 py-2 text-sm outline-none"
                  style={{ background: 'var(--inp)', border: '1px solid var(--bd)', color: 'var(--tx)' }}
                >
                  <option value="">כל הקטגוריות</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
              <select
                value={filterFree}
                onChange={e => setFilterFree(e.target.value as 'all' | 'free' | 'paid')}
                className="rounded-xl px-3 py-2 text-sm outline-none"
                style={{ background: 'var(--inp)', border: '1px solid var(--bd)', color: 'var(--tx)' }}
              >
                <option value="all">הכל</option>
                <option value="free">חינמי</option>
                <option value="paid">בתשלום</option>
              </select>
            </div>
          </div>

          {filteredFonts.length === 0 ? (
            <div className="rounded-2xl py-16 text-center text-sm"
              style={{ border: '2px dashed var(--bd)', background: 'var(--inp)', color: 'var(--tx3)' }}>
              {fonts.length === 0 ? 'מאגר הפונטים ריק' : 'לא נמצאו פונטים'}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {filteredFonts.map(font => <FontCard key={font.id} font={font} />)}
            </div>
          )}
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) loadFile(f); if (fileRef.current) fileRef.current.value = '' }}
      />
    </div>
  )
}

// ── Result row ────────────────────────────────────────────────────────────────
function FontResultRow({ font, name, rank, score }: {
  font: Font | null; name: string; rank: number; score: number
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-2.5"
      style={{ background: 'var(--s2)', border: '1px solid var(--bd)' }}>
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
        style={{ background: rank === 1 ? '#7c3aed' : rank === 2 ? '#6d28d9' : '#5b21b6' }}
      >
        {rank}
      </div>
      <div className="h-10 w-16 shrink-0 overflow-hidden rounded-lg" style={{ background: 'var(--inp)' }}>
        {font?.preview_image_url
          ? <img src={font.preview_image_url} alt="" className="h-full w-full object-cover" />
          : <div className="flex h-full w-full items-center justify-center text-xs font-black" style={{ color: 'rgba(124,58,237,.25)' }}>Aa</div>
        }
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold" style={{ color: 'var(--tx)' }}>{font?.name ?? name}</p>
        {font?.company && <p className="truncate text-xs" style={{ color: 'var(--tx3)' }}>{font.company}</p>}
      </div>
      {score > 0 && (
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-xs font-bold"
          style={score >= 70
            ? { background: 'rgba(16,185,129,.15)', color: '#059669' }
            : score >= 50
              ? { background: 'rgba(245,158,11,.15)', color: '#b45309' }
              : { background: 'rgba(124,58,237,.1)', color: '#7c3aed' }
          }
        >
          {score}%
        </span>
      )}
      {font?.download_url && (
        <a
          href={font.download_url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold text-white transition hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}
        >
          <ExternalLink size={10} />
          {font.is_free ? 'הורד' : 'רכוש'}
        </a>
      )}
    </div>
  )
}

// ── Gallery card ──────────────────────────────────────────────────────────────
function FontCard({ font }: { font: Font }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl transition-all hover:shadow-md"
      style={{ background: 'var(--s1)', border: '1px solid var(--bd)' }}>
      <div className="relative h-28 shrink-0 overflow-hidden" style={{ background: 'var(--inp)' }}>
        {font.preview_image_url
          ? <img src={font.preview_image_url} alt={font.name} className="h-full w-full object-cover" />
          : <div className="flex h-full w-full items-center justify-center"
              style={{ background: 'linear-gradient(135deg,rgba(124,58,237,.07),rgba(109,40,217,.13))' }}>
              <span className="select-none text-4xl font-black" style={{ color: 'rgba(124,58,237,.25)', fontFamily: 'Georgia,serif' }}>Aa</span>
            </div>
        }
        <div className="absolute end-2 top-2">
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold"
            style={font.is_free
              ? { background: 'rgba(16,185,129,.15)', border: '1px solid rgba(16,185,129,.3)', color: '#059669' }
              : { background: 'rgba(245,158,11,.15)', border: '1px solid rgba(245,158,11,.3)', color: '#b45309' }
            }
          >
            {font.is_free ? 'חינמי' : (font.price ?? 'בתשלום')}
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-3">
        <p className="font-semibold leading-snug" style={{ color: 'var(--tx)' }}>{font.name}</p>
        {font.name_hebrew && <p className="text-sm" style={{ color: 'var(--tx2)' }}>{font.name_hebrew}</p>}
        {font.company     && <p className="mt-0.5 text-xs" style={{ color: 'var(--tx3)' }}>{font.company}</p>}
        {font.category && (
          <span className="mt-2 self-start rounded-full px-2 py-0.5 text-[10px] font-medium"
            style={{ background: 'rgba(124,58,237,.1)', color: '#7c3aed' }}>
            {font.category}
          </span>
        )}
        {font.download_url && (
          <a
            href={font.download_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-white transition hover:opacity-90"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', marginTop: 'auto' }}
          >
            <ExternalLink size={11} />
            {font.is_free ? 'הורד חינם' : 'לרכישה'}
          </a>
        )}
      </div>
    </div>
  )
}

'use client'

import React, { useState, useRef } from 'react'
import { ScanText, X, Search, ExternalLink, ImagePlus } from 'lucide-react'
import type { Font } from '@/types'

type Props = {
  identifyFontFromDB: (
    imageBase64: string,
    imageMimeType: string,
  ) => Promise<{ matches?: string[]; description?: string; error?: string }>
  fonts: Font[]
}

export default function FontIdentifierClient({ identifyFontFromDB, fonts }: Props) {
  const [imageFile, setImageFile]     = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [isLoading, setIsLoading]     = useState(false)
  const [result, setResult]           = useState<{ matches?: string[]; description?: string; error?: string } | null>(null)
  const [search, setSearch]           = useState('')
  const [filterCat, setFilterCat]     = useState('')
  const [filterFree, setFilterFree]   = useState<'all' | 'free' | 'paid'>('all')

  const fileRef = useRef<HTMLInputElement>(null)

  const loadImageFile = (file: File) => {
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string
      setImagePreview(dataUrl)
      setImageBase64(dataUrl.split(',')[1])
    }
    reader.readAsDataURL(file)
    setResult(null)
  }

  const clearImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setImageBase64(null)
    setResult(null)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) loadImageFile(file)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'))
    if (!item) return
    e.preventDefault()
    const file = item.getAsFile()
    if (file) loadImageFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file?.type.startsWith('image/')) loadImageFile(file)
  }

  const handleIdentify = async () => {
    if (!imageBase64 || !imageFile || isLoading) return
    setIsLoading(true)
    try {
      const res = await identifyFontFromDB(imageBase64, imageFile.type)
      setResult(res)
    } catch {
      setResult({ error: 'שגיאת רשת' })
    }
    setIsLoading(false)
  }

  const matchedFonts = result?.matches
    ? fonts.filter(f => result.matches!.includes(f.name))
    : []

  const categories = Array.from(new Set(fonts.map(f => f.category).filter(Boolean))) as string[]

  const filteredFonts = fonts.filter(f => {
    const q = search.toLowerCase()
    const matchSearch = !q || f.name.toLowerCase().includes(q) || (f.name_hebrew?.toLowerCase().includes(q) ?? false) || (f.company?.toLowerCase().includes(q) ?? false)
    const matchCat  = !filterCat  || f.category === filterCat
    const matchFree = filterFree === 'all' || (filterFree === 'free' && f.is_free) || (filterFree === 'paid' && !f.is_free)
    return matchSearch && matchCat && matchFree
  })

  return (
    <div
      className="min-h-full overflow-y-auto"
      style={{ background: 'var(--bg)' }}
      onPaste={handlePaste}
    >

      {/* ── AI Identification ── */}
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
                העלה תמונה עם טקסט ו-AI יחפש במאגר הפונטים
              </p>
            </div>
          </div>

          {/* Upload zone */}
          {!imagePreview ? (
            <div
              onClick={() => fileRef.current?.click()}
              onDrop={handleDrop}
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
              <div className="relative">
                <img
                  src={imagePreview}
                  alt=""
                  className="max-h-72 w-full object-contain"
                  style={{ background: 'var(--inp)' }}
                />
                <button
                  onClick={clearImage}
                  className="absolute end-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="flex items-center justify-between gap-3 px-4 py-3"
                style={{ background: 'var(--s1)', borderTop: '1px solid var(--bd)' }}>
                <span className="truncate text-sm" style={{ color: 'var(--tx2)' }}>
                  {imageFile?.name}
                </span>
                <button
                  onClick={handleIdentify}
                  disabled={isLoading}
                  className="flex shrink-0 items-center gap-2 rounded-xl px-5 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}
                >
                  <ScanText size={15} />
                  {isLoading ? 'מזהה...' : 'זהה פונט'}
                </button>
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="mt-5 rounded-2xl p-5"
              style={{ background: 'var(--s1)', border: '1px solid var(--bd)' }}>
              {result.error ? (
                <p className="text-sm text-red-400">{result.error}</p>
              ) : (
                <>
                  {result.description && (
                    <p className="mb-4 text-sm" style={{ color: 'var(--tx2)' }}>{result.description}</p>
                  )}
                  {matchedFonts.length > 0 ? (
                    <>
                      <p className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--tx3)' }}>
                        פונטים מתאימים ({matchedFonts.length})
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {matchedFonts.map((font, i) => (
                          <FontCard key={font.id} font={font} rank={i + 1} />
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm" style={{ color: 'var(--tx3)' }}>לא נמצאו פונטים מתאימים במאגר</p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 lg:mx-8" style={{ borderTop: '1px solid var(--bd)' }} />

      {/* ── Font Gallery ── */}
      <div className="px-4 py-6 lg:px-8">
        <div className="mx-auto max-w-5xl">

          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold" style={{ color: 'var(--tx)' }}>מאגר הפונטים</h2>
              <p className="text-xs" style={{ color: 'var(--tx3)' }}>{fonts.length} פונטים</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search size={13} className="absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'var(--tx3)' }} />
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
              {fonts.length === 0
                ? 'מאגר הפונטים ריק — הוסף פונטים מפאנל הניהול'
                : 'לא נמצאו פונטים'}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {filteredFonts.map(font => <FontCard key={font.id} font={font} />)}
            </div>
          )}
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
    </div>
  )
}

function FontCard({ font, rank }: { font: Font; rank?: number }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl transition-all hover:shadow-md"
      style={{ background: 'var(--s1)', border: '1px solid var(--bd)' }}>

      {/* Preview */}
      <div className="relative h-28 overflow-hidden shrink-0" style={{ background: 'var(--inp)' }}>
        {font.preview_image_url ? (
          <img src={font.preview_image_url} alt={font.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center"
            style={{ background: 'linear-gradient(135deg,rgba(124,58,237,.07),rgba(109,40,217,.13))' }}>
            <span className="select-none text-4xl font-black"
              style={{ color: 'rgba(124,58,237,.25)', fontFamily: 'Georgia, serif' }}>
              Aa
            </span>
          </div>
        )}

        {typeof rank === 'number' && (
          <div className="absolute start-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white"
            style={{ background: rank === 1 ? '#7c3aed' : rank === 2 ? '#6d28d9' : '#5b21b6' }}>
            {rank}
          </div>
        )}

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

      {/* Info */}
      <div className="flex flex-1 flex-col p-3">
        <p className="font-semibold leading-snug" style={{ color: 'var(--tx)' }}>{font.name}</p>
        {font.name_hebrew && (
          <p className="text-sm" style={{ color: 'var(--tx2)' }}>{font.name_hebrew}</p>
        )}
        {font.company && (
          <p className="mt-0.5 text-xs" style={{ color: 'var(--tx3)' }}>{font.company}</p>
        )}
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

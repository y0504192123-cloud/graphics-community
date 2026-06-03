'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { ScanText, X, Search, ExternalLink, ImagePlus, RefreshCw } from 'lucide-react'
import type { Font } from '@/types'

type LetterMatch = { name: string; similarity: number; matchedLetter: string }
type IdentifyResult = { matches?: LetterMatch[]; error?: string; debug?: string }

type Props = {
  identifyByLetterEmbedding: (letterEmbedding: number[]) => Promise<IdentifyResult>
  fonts: Font[]
}

// ── CLIP model cache ──────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _clip: Promise<{ processor: any; model: any; mod: any }> | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getClip(): Promise<{ processor: any; model: any; mod: any }> {
  if (_clip) return _clip
  _clip = (async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = await import('@huggingface/transformers') as any
    mod.env.allowLocalModels = false
    mod.env.useBrowserCache  = true
    const [processor, model] = await Promise.all([
      mod.AutoProcessor.from_pretrained('Xenova/clip-vit-base-patch32'),
      mod.CLIPVisionModelWithProjection.from_pretrained('Xenova/clip-vit-base-patch32', { dtype: 'fp32' }),
    ])
    return { processor, model, mod }
  })()
  return _clip
}

async function computeEmbeddingFromDataUrl(dataUrl: string): Promise<number[] | null> {
  if (typeof window === 'undefined') return null
  try {
    const { processor, model, mod } = await getClip()
    const image  = await mod.RawImage.fromURL(dataUrl)
    const inputs = await processor(image)
    const { image_embeds } = await model(inputs)
    const raw  = Array.from(image_embeds.data as Float32Array) as number[]
    const norm = Math.sqrt(raw.reduce((s: number, v: number) => s + v * v, 0))
    return norm > 0 ? raw.map((v: number) => v / norm) : raw
  } catch (err) {
    console.warn('[clip-browser]', err)
    return null
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────
type SelBox = { x: number; y: number; w: number; h: number }
type SelState = 'idle' | 'dragging' | 'selected'
type Dims = { w: number; h: number }

const MAX_W = 640
const MAX_H = 320

// ── Main component ────────────────────────────────────────────────────────────
export default function FontIdentifierClient({ identifyByLetterEmbedding, fonts }: Props) {
  const [imagePreview, setImagePreview]     = useState<string | null>(null)
  const [imageFile, setImageFile]           = useState<File | null>(null)
  const [containerDims, setContainerDims]   = useState<Dims | null>(null)

  const [selState, setSelState]   = useState<SelState>('idle')
  const [selBox, setSelBox]       = useState<SelBox | null>(null)
  const dragStartRef              = useRef<{ x: number; y: number } | null>(null)

  const [cropPreview, setCropPreview] = useState<string | null>(null)
  const [identifying, setIdentifying] = useState(false)
  const [result, setResult]           = useState<IdentifyResult | null>(null)
  const [showDebug, setShowDebug]     = useState(false)

  const [search, setSearch]         = useState('')
  const [filterCat, setFilterCat]   = useState('')
  const [filterFree, setFilterFree] = useState<'all' | 'free' | 'paid'>('all')

  const imgRef    = useRef<HTMLImageElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileRef   = useRef<HTMLInputElement>(null)

  // ── Canvas drawing ──────────────────────────────────────────────────────────
  const drawCanvas = useCallback((box: SelBox | null) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height
    ctx.clearRect(0, 0, W, H)

    if (box && box.w > 3 && box.h > 3) {
      ctx.fillStyle = 'rgba(0,0,0,0.48)'
      ctx.fillRect(0, 0, W, H)
      ctx.clearRect(box.x, box.y, box.w, box.h)

      ctx.strokeStyle = '#7c3aed'
      ctx.lineWidth = 2
      ctx.strokeRect(box.x + 1, box.y + 1, box.w - 2, box.h - 2)

      // Corner handles
      const T = 10
      ctx.lineWidth = 3
      ctx.beginPath()
      for (const [cx, cy, sx, sy] of [
        [box.x, box.y, 1, 1], [box.x + box.w, box.y, -1, 1],
        [box.x, box.y + box.h, 1, -1], [box.x + box.w, box.y + box.h, -1, -1],
      ] as [number, number, number, number][]) {
        ctx.moveTo(cx + sx * T, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + sy * T)
      }
      ctx.stroke()
    } else {
      ctx.fillStyle = 'rgba(0,0,0,0.42)'
      ctx.fillRect(W / 2 - 105, H / 2 - 17, 210, 34)
      ctx.fillStyle = 'rgba(255,255,255,0.95)'
      ctx.font = '14px system-ui,sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('גרור להדגשת אות אחת', W / 2, H / 2)
    }
  }, [])

  useEffect(() => {
    if (containerDims) drawCanvas(null)
  }, [containerDims, drawCanvas])

  // ── Mouse handlers ──────────────────────────────────────────────────────────
  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = canvasRef.current!.getBoundingClientRect()
    return { x: Math.round(e.clientX - r.left), y: Math.round(e.clientY - r.top) }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    dragStartRef.current = getPos(e)
    setSelBox(null); setSelState('dragging')
    setCropPreview(null); setResult(null)
    drawCanvas(null)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (selState !== 'dragging' || !dragStartRef.current) return
    const p = getPos(e), s = dragStartRef.current
    const box: SelBox = { x: Math.min(p.x, s.x), y: Math.min(p.y, s.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) }
    setSelBox(box)
    drawCanvas(box)
  }

  const finalizeSelection = useCallback((e?: React.MouseEvent<HTMLCanvasElement>) => {
    if (selState !== 'dragging') return
    const s = dragStartRef.current
    if (!s) { setSelState('idle'); return }
    const p = e ? getPos(e) : s
    const box: SelBox = { x: Math.min(p.x, s.x), y: Math.min(p.y, s.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) }
    if (box.w > 10 && box.h > 10) {
      setSelBox(box); setSelState('selected'); drawCanvas(box)
    } else {
      setSelBox(null); setSelState('idle'); drawCanvas(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selState, drawCanvas])

  const handleReset = () => {
    setSelBox(null); setSelState('idle')
    setCropPreview(null); setResult(null)
    drawCanvas(null)
  }

  // ── Image load ──────────────────────────────────────────────────────────────
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    const scale = Math.min(MAX_W / img.naturalWidth, MAX_H / img.naturalHeight, 1)
    setContainerDims({ w: Math.round(img.naturalWidth * scale), h: Math.round(img.naturalHeight * scale) })
  }

  const loadFile = (file: File) => {
    setImageFile(file); setContainerDims(null)
    setSelBox(null); setSelState('idle'); setCropPreview(null); setResult(null)
    const reader = new FileReader()
    reader.onload = ev => setImagePreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const clearImage = () => {
    setImageFile(null); setImagePreview(null); setContainerDims(null)
    setSelBox(null); setSelState('idle'); setCropPreview(null); setResult(null)
  }

  // ── Crop + identify ─────────────────────────────────────────────────────────
  const handleIdentify = async () => {
    if (!selBox || !imgRef.current || !containerDims || identifying) return

    const img = imgRef.current
    const scaleX = img.naturalWidth  / containerDims.w
    const scaleY = img.naturalHeight / containerDims.h
    const srcX = Math.max(0, Math.round(selBox.x * scaleX))
    const srcY = Math.max(0, Math.round(selBox.y * scaleY))
    const srcW = Math.min(img.naturalWidth  - srcX, Math.round(selBox.w * scaleX))
    const srcH = Math.min(img.naturalHeight - srcY, Math.round(selBox.h * scaleY))

    if (srcW < 5 || srcH < 5) return

    // Render cropped letter onto 112×112 white canvas
    const out = document.createElement('canvas')
    out.width = 112; out.height = 112
    const ctx = out.getContext('2d')!
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, 112, 112)
    const pad = 10, maxSz = 112 - pad * 2
    const aspect = srcW / srcH
    const [dw, dh] = aspect >= 1 ? [maxSz, maxSz / aspect] : [maxSz * aspect, maxSz]
    ctx.drawImage(img, srcX, srcY, srcW, srcH, (112 - dw) / 2, (112 - dh) / 2, dw, dh)

    const dataUrl = out.toDataURL('image/png')
    setCropPreview(dataUrl)
    setIdentifying(true)
    setResult(null)

    try {
      const emb = await computeEmbeddingFromDataUrl(dataUrl)
      if (!emb) { setResult({ error: 'שגיאה בחישוב embedding' }); setIdentifying(false); return }
      const res = await identifyByLetterEmbedding(emb)
      setResult(res)
    } catch {
      setResult({ error: 'שגיאת רשת' })
    }
    setIdentifying(false)
  }

  // ── Gallery helpers ─────────────────────────────────────────────────────────
  const categories  = Array.from(new Set(fonts.map(f => f.category).filter(Boolean))) as string[]
  const filteredFonts = fonts.filter(f => {
    const q = search.toLowerCase()
    return (!q || f.name.toLowerCase().includes(q) || (f.name_hebrew?.toLowerCase().includes(q) ?? false) || (f.company?.toLowerCase().includes(q) ?? false))
      && (!filterCat  || f.category === filterCat)
      && (filterFree === 'all' || (filterFree === 'free' && f.is_free) || (filterFree === 'paid' && !f.is_free))
  })

  const matchedFonts = (result?.matches ?? [])
    .map(m => ({ ...m, font: fonts.find(f => f.name === m.name) }))
    .filter(m => m.font != null)

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
                העלה תמונה · סמן אות בגרירה · קבל את הפונטים הדומים ביותר
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
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: 'rgba(124,58,237,.1)' }}>
                <ImagePlus size={24} className="text-purple-400" />
              </div>
              <div>
                <p className="font-semibold" style={{ color: 'var(--tx)' }}>גרור תמונה לכאן או לחץ לבחירה</p>
                <p className="mt-1 text-sm" style={{ color: 'var(--tx3)' }}>PNG, JPG, WebP · Ctrl+V להדבקה</p>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl" style={{ border: '1px solid var(--bd)' }}>

              {/* Image + canvas overlay */}
              <div className="flex justify-center" style={{ background: '#f5f5f5' }}>
                <div
                  style={{
                    position: 'relative',
                    ...(containerDims
                      ? { width: containerDims.w, height: containerDims.h }
                      : { width: '100%', minHeight: 160 }),
                  }}
                >
                  <img
                    ref={imgRef}
                    src={imagePreview}
                    alt=""
                    onLoad={handleImageLoad}
                    draggable={false}
                    style={{
                      display: 'block',
                      width: containerDims ? containerDims.w : '100%',
                      height: containerDims ? containerDims.h : 'auto',
                      objectFit: 'fill',
                      userSelect: 'none',
                    }}
                  />
                  {containerDims && (
                    <canvas
                      ref={canvasRef}
                      width={containerDims.w}
                      height={containerDims.h}
                      style={{ position: 'absolute', inset: 0, cursor: 'crosshair', touchAction: 'none' }}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={e => finalizeSelection(e)}
                      onMouseLeave={() => { if (selState === 'dragging') finalizeSelection() }}
                    />
                  )}
                </div>
              </div>

              {/* Controls bar */}
              <div className="flex items-center justify-between gap-3 px-4 py-3"
                style={{ background: 'var(--s1)', borderTop: '1px solid var(--bd)' }}>
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {cropPreview && (
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg"
                      style={{ border: '2px solid rgba(124,58,237,.4)', background: '#fff' }}>
                      <img src={cropPreview} alt="" className="h-full w-full object-contain" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="block truncate text-xs" style={{ color: 'var(--tx2)' }}>{imageFile?.name}</span>
                    <span className="text-[11px]"
                      style={{ color: selState === 'selected' ? '#059669' : 'var(--tx3)' }}>
                      {selState === 'idle'     && 'גרור להדגשת אות אחת'}
                      {selState === 'dragging' && 'שחרר לסיום הסימון'}
                      {selState === 'selected' && '✓ אות מסומנת — לחץ זהה'}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {selState === 'selected' && (
                    <button onClick={handleReset}
                      className="flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition hover:opacity-70"
                      style={{ borderColor: 'var(--bd)', color: 'var(--tx2)' }}>
                      <RefreshCw size={11} />
                      סמן מחדש
                    </button>
                  )}
                  <button
                    onClick={handleIdentify}
                    disabled={selState !== 'selected' || identifying}
                    className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
                    <ScanText size={14} />
                    {identifying ? 'מזהה...' : 'זהה לפי אות זו'}
                  </button>
                  <button onClick={clearImage}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition hover:opacity-70"
                    style={{ background: 'var(--inp)', border: '1px solid var(--bd)', color: 'var(--tx3)' }}>
                    <X size={13} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="mt-5 rounded-2xl p-5" style={{ background: 'var(--s1)', border: '1px solid var(--bd)' }}>
              {result.error ? (
                <p className="text-sm text-red-400">{result.error}</p>
              ) : (
                <>
                  <div className="mb-3 flex items-center gap-2">
                    {cropPreview && (
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg"
                        style={{ border: '1px solid var(--bd)', background: '#fff' }}>
                        <img src={cropPreview} alt="" className="h-full w-full object-contain" />
                      </div>
                    )}
                    <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--tx3)' }}>
                      {matchedFonts.length > 0 ? `${matchedFonts.length} פונטים דומים ביותר` : 'לא נמצאו תוצאות'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    {matchedFonts.map(({ font, similarity, matchedLetter }, i) => (
                      <FontResultRow
                        key={font!.id}
                        font={font!}
                        rank={i + 1}
                        similarity={similarity}
                        matchedLetter={matchedLetter}
                      />
                    ))}
                    {matchedFonts.length === 0 && (
                      <p className="text-sm" style={{ color: 'var(--tx3)' }}>
                        נסה לסמן אות אחרת, או הרץ "בנה letter embeddings" בפאנל הניהול.
                      </p>
                    )}
                  </div>
                </>
              )}

              {result.debug && (
                <div className="mt-4 border-t pt-4" style={{ borderColor: 'var(--bd)' }}>
                  <button onClick={() => setShowDebug(v => !v)} className="text-xs font-mono" style={{ color: 'var(--tx3)' }}>
                    {showDebug ? '▲ הסתר debug' : '▼ הצג debug log'}
                  </button>
                  {showDebug && (
                    <pre className="mt-2 overflow-x-auto rounded-xl p-3 text-[11px] leading-relaxed font-mono"
                      style={{ background: 'var(--inp)', color: 'var(--tx2)', whiteSpace: 'pre-wrap', direction: 'ltr', textAlign: 'left' }}>
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
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="חפש פונט..."
                  className="rounded-xl py-2 pe-3 ps-8 text-sm outline-none"
                  style={{ background: 'var(--inp)', border: '1px solid var(--bd)', color: 'var(--tx)', width: '160px' }} />
              </div>
              {categories.length > 0 && (
                <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
                  className="rounded-xl px-3 py-2 text-sm outline-none"
                  style={{ background: 'var(--inp)', border: '1px solid var(--bd)', color: 'var(--tx)' }}>
                  <option value="">כל הקטגוריות</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
              <select value={filterFree} onChange={e => setFilterFree(e.target.value as 'all' | 'free' | 'paid')}
                className="rounded-xl px-3 py-2 text-sm outline-none"
                style={{ background: 'var(--inp)', border: '1px solid var(--bd)', color: 'var(--tx)' }}>
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

      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) loadFile(f); if (fileRef.current) fileRef.current.value = '' }} />
    </div>
  )
}

// ── Result row ────────────────────────────────────────────────────────────────
function FontResultRow({ font, rank, similarity, matchedLetter }: {
  font: Font; rank: number; similarity: number; matchedLetter: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-2.5"
      style={{ background: 'var(--s2)', border: '1px solid var(--bd)' }}>
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
        style={{ background: rank === 1 ? '#7c3aed' : rank === 2 ? '#6d28d9' : '#5b21b6' }}>
        {rank}
      </div>
      <div className="h-10 w-16 shrink-0 overflow-hidden rounded-lg" style={{ background: 'var(--inp)' }}>
        {font.preview_image_url
          ? <img src={font.preview_image_url} alt="" className="h-full w-full object-cover" />
          : <div className="flex h-full w-full items-center justify-center text-xs font-black" style={{ color: 'rgba(124,58,237,.25)' }}>Aa</div>
        }
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold" style={{ color: 'var(--tx)' }}>{font.name}</p>
        {font.company && <p className="truncate text-xs" style={{ color: 'var(--tx3)' }}>{font.company}</p>}
      </div>
      <div className="shrink-0 text-xl font-bold" style={{ color: 'rgba(124,58,237,.55)', minWidth: '24px', textAlign: 'center' }}>
        {matchedLetter}
      </div>
      <span className="shrink-0 rounded-full px-2 py-0.5 text-xs font-bold"
        style={similarity >= 70
          ? { background: 'rgba(16,185,129,.15)', color: '#059669' }
          : similarity >= 50
            ? { background: 'rgba(245,158,11,.15)', color: '#b45309' }
            : { background: 'rgba(124,58,237,.1)', color: '#7c3aed' }
        }>
        {similarity}%
      </span>
      {font.download_url && (
        <a href={font.download_url} target="_blank" rel="noopener noreferrer"
          className="shrink-0 flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold text-white transition hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
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
          <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
            style={font.is_free
              ? { background: 'rgba(16,185,129,.15)', border: '1px solid rgba(16,185,129,.3)', color: '#059669' }
              : { background: 'rgba(245,158,11,.15)', border: '1px solid rgba(245,158,11,.3)', color: '#b45309' }
            }>
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
          <a href={font.download_url} target="_blank" rel="noopener noreferrer"
            className="mt-3 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-white transition hover:opacity-90"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', marginTop: 'auto' }}>
            <ExternalLink size={11} />
            {font.is_free ? 'הורד חינם' : 'לרכישה'}
          </a>
        )}
      </div>
    </div>
  )
}

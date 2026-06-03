'use client'

import { useState, useTransition, useActionState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Trash2, Pencil, X, Search, Upload, ImageIcon,
  FileUp, Check, AlertCircle, Loader2, Building2,
} from 'lucide-react'
import type { Font, FontWeight } from '@/types'

type SaveResult = { error?: string } | null
type WeightEntry = { weight_name: string; preview_image_url: string; download_url: string }
type UploadFn = () => Promise<{ signedUrl?: string; publicUrl?: string; error?: string }>

type Props = {
  fonts: Font[]
  fontWeights: FontWeight[]
  saveFont: (prev: SaveResult, fd: FormData) => Promise<SaveResult>
  deleteFont: (id: string) => Promise<void>
  getFontPreviewUploadUrl: UploadFn
  getFontFileUploadUrl: (fileName: string) => Promise<{ signedUrl?: string; path?: string; error?: string }>
  generateFontPreview: (fontId: string, filePath: string) => Promise<{ error?: string; previewUrl?: string }>
  createFontWithPreview: (filePath: string, fontName: string) => Promise<{ fontId?: string; fontName?: string; previewUrl?: string; error?: string }>
  updateFontsCompany: (fontIds: string[], company: string, downloadUrl: string) => Promise<{ error?: string }>
  quickUpdateFont: (id: string, updates: { name?: string; company?: string; download_url?: string; is_free?: boolean }) => Promise<{ error?: string }>
  recomputeHashBatch: (offset: number, limit: number) => Promise<{ done: number; errors: number; total: number; batchSize: number }>
}

const inp = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-100'
const lbl = 'mb-1 block text-[11px] font-semibold uppercase tracking-widest text-slate-500'

// ── WeightRow ─────────────────────────────────────────────────────────────────
function WeightRow({ weight, onUpdate, onRemove, getUploadUrl }: {
  weight: WeightEntry
  onUpdate: (field: keyof WeightEntry, val: string) => void
  onRemove: () => void
  getUploadUrl: UploadFn
}) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (file: File) => {
    setUploading(true); setUploadError(null)
    try {
      const { signedUrl, publicUrl, error } = await getUploadUrl()
      if (error || !signedUrl || !publicUrl) { setUploadError(error ?? 'שגיאה'); return }
      const res = await fetch(signedUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
      if (!res.ok) { setUploadError('העלאה נכשלה'); return }
      onUpdate('preview_image_url', publicUrl)
    } catch { setUploadError('שגיאת רשת') }
    finally { setUploading(false) }
  }

  return (
    <div className="flex flex-wrap items-start gap-2 rounded-xl p-3"
      style={{ background: 'var(--inp)', border: '1px solid var(--bd)' }}>
      <input value={weight.weight_name} onChange={e => onUpdate('weight_name', e.target.value)}
        placeholder="Regular, Bold..." className={inp} style={{ flex: '1 1 130px' }} />
      <div className="flex shrink-0 items-center gap-2">
        {weight.preview_image_url ? (
          <div className="relative h-9 w-14 overflow-hidden rounded-lg" style={{ border: '1px solid var(--bd)' }}>
            <img src={weight.preview_image_url} alt="" className="h-full w-full object-cover" />
            <button type="button" onClick={() => onUpdate('preview_image_url', '')}
              className="absolute end-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-white">
              <X size={8} />
            </button>
          </div>
        ) : (
          <div className="flex h-9 w-14 items-center justify-center rounded-lg"
            style={{ background: 'rgba(0,0,0,.04)', border: '1px dashed var(--bd)' }}>
            <ImageIcon size={13} style={{ color: 'var(--tx3)' }} />
          </div>
        )}
        <div className="flex flex-col gap-0.5">
          <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition hover:opacity-80 disabled:opacity-40"
            style={{ background: 'var(--s1)', border: '1px solid var(--bd)', color: 'var(--tx2)' }}>
            <Upload size={11} />
            {uploading ? 'מעלה...' : 'תמונה'}
          </button>
          {uploadError && <p className="max-w-[80px] text-[10px] leading-tight text-red-400">{uploadError}</p>}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); if (fileRef.current) fileRef.current.value = '' }} />
      </div>
      <input value={weight.download_url} onChange={e => onUpdate('download_url', e.target.value)}
        placeholder="URL הורדה" className={inp} dir="ltr" style={{ flex: '2 1 160px' }} />
      <button type="button" onClick={onRemove}
        className="mt-1 shrink-0 rounded-lg p-1.5 transition hover:bg-red-500/10 hover:text-red-400"
        style={{ color: 'var(--tx3)' }}>
        <X size={13} />
      </button>
    </div>
  )
}

// ── FontFileUploadButton ──────────────────────────────────────────────────────
type FontFileStatus = 'idle' | 'uploading' | 'generating' | 'done' | 'error'

function FontFileUploadButton({ fontId, hasFile, getFontFileUploadUrl, generateFontPreview }: {
  fontId: string
  hasFile: boolean
  getFontFileUploadUrl: (name: string) => Promise<{ signedUrl?: string; path?: string; error?: string }>
  generateFontPreview: (fontId: string, filePath: string) => Promise<{ error?: string; previewUrl?: string }>
}) {
  const [status, setStatus] = useState<FontFileStatus>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setStatus('uploading'); setErrorMsg(null)
    try {
      const { signedUrl, path, error } = await getFontFileUploadUrl(file.name)
      if (error || !signedUrl || !path) { setStatus('error'); setErrorMsg(error ?? 'שגיאה'); return }
      const res = await fetch(signedUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type || 'font/ttf' } })
      if (!res.ok) { setStatus('error'); setErrorMsg('העלאה נכשלה'); return }
      setStatus('generating')
      const result = await generateFontPreview(fontId, path)
      if (result.error) { setStatus('error'); setErrorMsg(result.error); return }
      setStatus('done'); setTimeout(() => setStatus('idle'), 3000)
    } catch { setStatus('error'); setErrorMsg('שגיאת רשת') }
  }

  const busy = status === 'uploading' || status === 'generating'
  const labels: Record<FontFileStatus, string> = {
    idle: hasFile ? 'החלף TTF' : 'העלה TTF',
    uploading: 'מעלה...', generating: 'מחולל...', done: '✓', error: 'שנית',
  }

  return (
    <div className="flex flex-col items-start gap-0.5">
      <button type="button" disabled={busy} onClick={() => fileRef.current?.click()}
        title="העלה קובץ TTF/OTF"
        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition hover:opacity-80 disabled:opacity-40"
        style={{
          background: status === 'done' ? 'rgba(16,185,129,.1)' : status === 'error' ? 'rgba(239,68,68,.08)' : 'var(--inp)',
          border: `1px solid ${status === 'done' ? 'rgba(16,185,129,.3)' : status === 'error' ? 'rgba(239,68,68,.3)' : 'var(--bd)'}`,
          color: status === 'done' ? '#059669' : status === 'error' ? '#ef4444' : 'var(--tx2)',
        }}>
        <FileUp size={10} />
        {labels[status]}
      </button>
      {errorMsg && <p className="max-w-[90px] text-[10px] leading-tight text-red-400">{errorMsg}</p>}
      <input ref={fileRef} type="file" accept=".ttf,.otf" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); if (fileRef.current) fileRef.current.value = '' }} />
    </div>
  )
}

// ── FontForm (detailed edit/add) ──────────────────────────────────────────────
function FontForm({ editingFont, initialWeights, saveAction, savePending, saveState, onCancel, getFontPreviewUploadUrl }: {
  editingFont: Font | null
  initialWeights: WeightEntry[]
  saveAction: (fd: FormData) => void
  savePending: boolean
  saveState: SaveResult
  onCancel: () => void
  getFontPreviewUploadUrl: UploadFn
}) {
  const [isFree, setIsFree]           = useState(editingFont?.is_free ?? true)
  const [previewUrl, setPreviewUrl]   = useState(editingFont?.preview_image_url ?? '')
  const [uploading, setUploading]     = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [weights, setWeights]         = useState<WeightEntry[]>(initialWeights)
  const previewFileRef                = useRef<HTMLInputElement>(null)

  const handlePreviewUpload = async (file: File) => {
    setUploading(true); setUploadError(null)
    try {
      const { signedUrl, publicUrl, error } = await getFontPreviewUploadUrl()
      if (error || !signedUrl || !publicUrl) { setUploadError(error ?? 'שגיאה'); return }
      const res = await fetch(signedUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
      if (!res.ok) { setUploadError('העלאה נכשלה'); return }
      setPreviewUrl(publicUrl)
    } catch { setUploadError('שגיאת רשת') }
    finally { setUploading(false) }
  }

  const addWeight    = () => setWeights(w => [...w, { weight_name: '', preview_image_url: '', download_url: '' }])
  const removeWeight = (i: number) => setWeights(w => w.filter((_, idx) => idx !== i))
  const updateWeight = (i: number, field: keyof WeightEntry, val: string) =>
    setWeights(w => w.map((e, idx) => idx === i ? { ...e, [field]: val } : e))

  return (
    <form key={editingFont?.id ?? 'new'} action={saveAction} className="space-y-4 rounded-2xl p-5"
      style={{ background: 'rgba(124,58,237,.05)', border: '1px solid rgba(124,58,237,.2)' }}>
      {editingFont && <input type="hidden" name="id" value={editingFont.id} />}
      <input type="hidden" name="preview_image_url" value={previewUrl} />
      <input type="hidden" name="weights" value={JSON.stringify(weights)} />

      {saveState?.error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{saveState.error}</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className={lbl}>שם הפונט (באנגלית) *</label>
          <input name="name" required className={inp} defaultValue={editingFont?.name ?? ''} placeholder="Almoni" /></div>
        <div><label className={lbl}>שם בעברית</label>
          <input name="name_hebrew" className={inp} defaultValue={editingFont?.name_hebrew ?? ''} placeholder="אלמוני" /></div>
        <div><label className={lbl}>חברה / יוצר</label>
          <input name="company" className={inp} defaultValue={editingFont?.company ?? ''} placeholder="Masterfont" /></div>
        <div><label className={lbl}>קטגוריה</label>
          <input name="category" className={inp} defaultValue={editingFont?.category ?? ''} placeholder="serif / sans-serif..." /></div>
        <div><label className={lbl}>סגנון</label>
          <input name="style" className={inp} defaultValue={editingFont?.style ?? ''} placeholder="Bold, Regular..." /></div>
        <div><label className={lbl}>תגיות (מופרדות בפסיקים)</label>
          <input name="tags" className={inp} defaultValue={editingFont?.tags?.join(', ') ?? ''} placeholder="עברית, כותרת" /></div>
      </div>

      <div><label className={lbl}>קישור הורדה / רכישה</label>
        <input name="download_url" type="url" className={inp} dir="ltr" defaultValue={editingFont?.download_url ?? ''} placeholder="https://..." /></div>

      <div>
        <label className={lbl}>תמונת תצוגה מקדימה</label>
        <div className="flex items-start gap-3">
          {previewUrl ? (
            <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl" style={{ border: '1px solid var(--bd)' }}>
              <img src={previewUrl} alt="" className="h-full w-full object-cover" />
              <button type="button" onClick={() => setPreviewUrl('')}
                className="absolute end-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white">
                <X size={10} />
              </button>
            </div>
          ) : (
            <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-xl"
              style={{ background: 'var(--inp)', border: '1px dashed var(--bd)' }}>
              <ImageIcon size={18} style={{ color: 'var(--tx3)' }} />
            </div>
          )}
          <div>
            <button type="button" disabled={uploading} onClick={() => previewFileRef.current?.click()}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition hover:opacity-80 disabled:opacity-50"
              style={{ background: 'var(--inp)', border: '1px solid var(--bd)', color: 'var(--tx2)' }}>
              <Upload size={14} />
              {uploading ? 'מעלה...' : previewUrl ? 'החלף תמונה' : 'העלה תמונה'}
            </button>
            {uploadError && <p className="mt-1 text-xs text-red-400">{uploadError}</p>}
            <p className="mt-1 text-[11px]" style={{ color: 'var(--tx3)' }}>PNG, JPG, WebP</p>
          </div>
        </div>
        <input ref={previewFileRef} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handlePreviewUpload(f); if (previewFileRef.current) previewFileRef.current.value = '' }} />
      </div>

      <div><label className={lbl}>תיאור</label>
        <textarea name="description" rows={2} className={`${inp} resize-none`}
          defaultValue={editingFont?.description ?? ''} placeholder="תיאור קצר..." /></div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium" style={{ color: 'var(--tx)' }}>
          <input type="checkbox" name="is_free" checked={isFree} onChange={e => setIsFree(e.target.checked)} className="h-4 w-4 rounded accent-purple-600" />
          פונט חינמי
        </label>
        {!isFree && (
          <div className="flex items-center gap-2">
            <label className={`${lbl} mb-0`}>מחיר</label>
            <input name="price" className={`${inp} w-32`} defaultValue={editingFont?.price ?? ''} placeholder="₪99 / $19..." />
          </div>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className={`${lbl} mb-0`}>משקלים / גרסאות</label>
          <button type="button" onClick={addWeight}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition hover:opacity-80"
            style={{ background: 'rgba(124,58,237,.1)', color: '#7c3aed' }}>
            <Plus size={12} /> הוסף משקל
          </button>
        </div>
        {weights.length === 0 ? (
          <p className="rounded-xl py-3 text-center text-xs" style={{ background: 'var(--inp)', color: 'var(--tx3)' }}>
            אין משקלים — לחץ "הוסף משקל"
          </p>
        ) : (
          <div className="space-y-2">
            {weights.map((w, i) => (
              <WeightRow key={i} weight={w}
                onUpdate={(field, val) => updateWeight(i, field, val)}
                onRemove={() => removeWeight(i)}
                getUploadUrl={getFontPreviewUploadUrl} />
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button type="submit" disabled={savePending}
          className="flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
          <Plus size={14} />
          {savePending ? 'שומר...' : editingFont ? 'עדכן פונט' : 'הוסף פונט'}
        </button>
        <button type="button" onClick={onCancel}
          className="rounded-xl border px-4 py-2 text-sm font-medium transition hover:bg-slate-100"
          style={{ borderColor: 'var(--bd)', color: 'var(--tx2)' }}>
          ביטול
        </button>
      </div>
    </form>
  )
}

// ── BulkUploadZone ────────────────────────────────────────────────────────────
type UploadItem = {
  id: string
  fileName: string
  status: 'queued' | 'uploading' | 'generating' | 'done' | 'error'
  error?: string
  fontId?: string
  fontName?: string
  previewUrl?: string
}

function BulkUploadZone({ getFontFileUploadUrl, createFontWithPreview, onBatchDone }: {
  getFontFileUploadUrl: (name: string) => Promise<{ signedUrl?: string; path?: string; error?: string }>
  createFontWithPreview: (filePath: string, fontName: string) => Promise<{ fontId?: string; fontName?: string; previewUrl?: string; error?: string }>
  onBatchDone: (uploaded: { fontId: string; fontName: string; originalBaseName: string }[]) => void
}) {
  const [items, setItems] = useState<UploadItem[]>([])
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const cleanName = (fileName: string): string => {
    let name = fileName.replace(/\.(ttf|otf)$/i, '')
    name = name.replace(/[_-]/g, ' ')
    // Split "MLDavid" → "ML David" (uppercase run before Title word)
    name = name.replace(/([A-Z]+?)([A-Z][a-z])/g, '$1 $2')
    // Split "FbGalbyan" → "Fb Galbyan" (lowercase → uppercase)
    name = name.replace(/([a-z])([A-Z])/g, '$1 $2')
    name = name.replace(/\s+/g, ' ').trim()
    // Title-case each word
    name = name.replace(/\b\w/g, c => c.toUpperCase())
    // Fix ALL-CAPS prefix (2-4 chars) at start: "FB " → "Fb ", "ML " → "Ml "
    name = name.replace(/^([A-Z]{2,4})\b/, m => m[0] + m.slice(1).toLowerCase())
    return name
  }

  const processFiles = useCallback(async (files: File[]) => {
    const valid = files.filter(f => /\.(ttf|otf)$/i.test(f.name))
    if (!valid.length) return

    const newItems: UploadItem[] = valid.map(f => ({
      id: `${f.name}_${Math.random()}`,
      fileName: f.name,
      status: 'queued' as const,
    }))
    setItems(prev => [...prev, ...newItems])

    const completed: { fontId: string; fontName: string; originalBaseName: string }[] = []

    for (let i = 0; i < valid.length; i++) {
      const file = valid[i]
      const item = newItems[i]

      setItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'uploading' } : it))

      try {
        const { signedUrl, path, error: urlErr } = await getFontFileUploadUrl(file.name)
        if (urlErr || !signedUrl || !path) {
          setItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'error', error: urlErr ?? 'שגיאת URL' } : it))
          continue
        }

        const res = await fetch(signedUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type || 'font/ttf' } })
        if (!res.ok) {
          setItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'error', error: 'העלאה נכשלה' } : it))
          continue
        }

        setItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'generating' } : it))

        const result = await createFontWithPreview(path, cleanName(file.name))
        if (result.error || !result.fontId) {
          setItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'error', error: result.error ?? 'שגיאה' } : it))
          continue
        }

        setItems(prev => prev.map(it => it.id === item.id ? {
          ...it, status: 'done', fontId: result.fontId, fontName: result.fontName, previewUrl: result.previewUrl,
        } : it))

        completed.push({
          fontId: result.fontId!,
          fontName: result.fontName!,
          originalBaseName: file.name.replace(/\.(ttf|otf)$/i, ''),
        })
      } catch {
        setItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'error', error: 'שגיאת רשת' } : it))
      }
    }

    if (completed.length > 0) onBatchDone(completed)
  }, [getFontFileUploadUrl, createFontWithPreview, onBatchDone])

  const doneCount  = items.filter(i => i.status === 'done').length
  const errorCount = items.filter(i => i.status === 'error').length
  const allDone    = items.length > 0 && items.every(i => i.status === 'done' || i.status === 'error')

  return (
    <div className="mb-6">
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); processFiles(Array.from(e.dataTransfer.files)) }}
        onClick={() => inputRef.current?.click()}
        className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl py-10 transition-all"
        style={{
          border: `2px dashed ${dragging ? '#7c3aed' : 'var(--bd)'}`,
          background: dragging ? 'rgba(124,58,237,.06)' : 'var(--inp)',
        }}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ background: 'rgba(124,58,237,.1)', border: '1px solid rgba(124,58,237,.2)' }}>
          <FileUp size={26} style={{ color: '#7c3aed' }} />
        </div>
        <div className="text-center">
          <p className="font-bold" style={{ color: 'var(--tx)' }}>גרור קבצי TTF / OTF לכאן</p>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--tx3)' }}>
            או לחץ לבחירה — ניתן לבחור עשרות קבצים בבת אחת
          </p>
        </div>
      </div>
      <input ref={inputRef} type="file" accept=".ttf,.otf" multiple className="hidden"
        onChange={e => { if (e.target.files) processFiles(Array.from(e.target.files)); if (inputRef.current) inputRef.current.value = '' }} />

      {items.length > 0 && (
        <div className="mt-3 space-y-1">
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-3 rounded-xl px-3 py-2"
              style={{ background: 'var(--s2)', border: '1px solid var(--bd)' }}>
              <div className="h-7 w-11 shrink-0 overflow-hidden rounded-md" style={{ background: 'var(--inp)' }}>
                {item.previewUrl
                  ? <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
                  : <div className="flex h-full w-full items-center justify-center">
                      <span className="text-[10px] font-black" style={{ color: 'rgba(124,58,237,.3)' }}>Aa</span>
                    </div>
                }
              </div>
              <span className="min-w-0 flex-1 truncate text-sm" style={{ color: 'var(--tx2)' }}>
                {item.fontName ?? item.fileName}
              </span>
              <span className="shrink-0 flex items-center gap-1 text-xs">
                {item.status === 'queued'     && <span style={{ color: 'var(--tx3)' }}>ממתין...</span>}
                {item.status === 'uploading'  && <><Loader2 size={11} className="animate-spin" style={{ color: '#7c3aed' }} /><span style={{ color: '#7c3aed' }}>מעלה</span></>}
                {item.status === 'generating' && <><Loader2 size={11} className="animate-spin" style={{ color: '#f59e0b' }} /><span style={{ color: '#f59e0b' }}>מחולל preview</span></>}
                {item.status === 'done'       && <><Check size={11} style={{ color: '#10b981' }} /><span style={{ color: '#10b981' }}>הושלם</span></>}
                {item.status === 'error'      && <><AlertCircle size={11} style={{ color: '#ef4444' }} /><span className="max-w-[120px] truncate" style={{ color: '#ef4444' }}>{item.error ?? 'שגיאה'}</span></>}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between px-1 pt-1 text-xs" style={{ color: 'var(--tx3)' }}>
            <span>
              {doneCount}/{items.length} הושלמו
              {errorCount > 0 && ` · ${errorCount} שגיאות`}
            </span>
            {allDone && (
              <button onClick={() => setItems([])} className="hover:underline" style={{ color: '#7c3aed' }}>
                נקה
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── PrefixGroups ──────────────────────────────────────────────────────────────
type PrefixGroup = {
  prefix: string
  fontIds: string[]
  company: string
  url: string
  applied: boolean
}

function PrefixGroups({ groups: init, updateFontsCompany }: {
  groups: PrefixGroup[]
  updateFontsCompany: (fontIds: string[], company: string, downloadUrl: string) => Promise<{ error?: string }>
}) {
  const [groups, setGroups] = useState(init)
  const [saving, setSaving] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const set = (prefix: string, field: 'company' | 'url', val: string) =>
    setGroups(g => g.map(gr => gr.prefix === prefix ? { ...gr, [field]: val } : gr))

  const apply = async (group: PrefixGroup) => {
    if (!group.company.trim()) return
    setSaving(group.prefix)
    const r = await updateFontsCompany(group.fontIds, group.company.trim(), group.url.trim())
    setSaving(null)
    if (r.error) { setErrors(e => ({ ...e, [group.prefix]: r.error! })); return }
    setGroups(g => g.map(gr => gr.prefix === group.prefix ? { ...gr, applied: true } : gr))
  }

  const pending = groups.filter(g => !g.applied)
  if (pending.length === 0) return null

  return (
    <div className="mb-6 rounded-2xl p-4 space-y-3"
      style={{ background: 'rgba(245,158,11,.05)', border: '1px solid rgba(245,158,11,.25)' }}>
      <div className="flex items-center gap-2">
        <Building2 size={15} style={{ color: '#b45309' }} />
        <h3 className="font-bold text-sm" style={{ color: '#92400e' }}>
          זוהו קידומות — שייך לחברות
        </h3>
      </div>
      {pending.map(group => (
        <div key={group.prefix} className="rounded-xl p-3"
          style={{ background: 'var(--s2)', border: '1px solid var(--bd)' }}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold"
              style={{ background: 'rgba(245,158,11,.15)', color: '#b45309' }}>
              {group.prefix}
            </span>
            <span className="text-xs" style={{ color: 'var(--tx3)' }}>{group.fontIds.length} פונטים</span>
            <input
              value={group.company}
              onChange={e => set(group.prefix, 'company', e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') apply(group) }}
              placeholder="שם חברה *"
              className="rounded-lg border bg-white px-2.5 py-1.5 text-sm outline-none transition focus:border-purple-400"
              style={{ flex: '1 1 120px', borderColor: 'var(--bd)', color: 'var(--tx)' }}
            />
            <input
              value={group.url}
              onChange={e => set(group.prefix, 'url', e.target.value)}
              placeholder="אתר רכישה (אופציונלי)"
              dir="ltr"
              className="rounded-lg border bg-white px-2.5 py-1.5 text-sm outline-none transition focus:border-purple-400"
              style={{ flex: '2 1 160px', borderColor: 'var(--bd)', color: 'var(--tx)' }}
            />
            <button
              onClick={() => apply(group)}
              disabled={!group.company.trim() || saving === group.prefix}
              className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
              {saving === group.prefix ? '...' : 'החל'}
            </button>
          </div>
          {errors[group.prefix] && (
            <p className="mt-1 text-xs text-red-400">{errors[group.prefix]}</p>
          )}
        </div>
      ))}
    </div>
  )
}

// ── FontTableRow (inline edit) ────────────────────────────────────────────────
function FontTableRow({ font, quickUpdateFont, deleteFont, getFontFileUploadUrl, generateFontPreview, onEdit }: {
  font: Font
  quickUpdateFont: (id: string, updates: { name?: string; company?: string; download_url?: string; is_free?: boolean }) => Promise<{ error?: string }>
  deleteFont: (id: string) => Promise<void>
  getFontFileUploadUrl: (name: string) => Promise<{ signedUrl?: string; path?: string; error?: string }>
  generateFontPreview: (fontId: string, filePath: string) => Promise<{ error?: string; previewUrl?: string }>
  onEdit: (font: Font) => void
}) {
  const [name, setName]         = useState(font.name)
  const [company, setCompany]   = useState(font.company ?? '')
  const [url, setUrl]           = useState(font.download_url ?? '')
  const [isFree, setIsFree]     = useState(font.is_free)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [delPending, startDel]  = useTransition()

  const isDirty = name !== font.name || company !== (font.company ?? '') ||
    url !== (font.download_url ?? '') || isFree !== font.is_free

  const save = async () => {
    if (!name.trim()) return
    setSaving(true); setError(null)
    const r = await quickUpdateFont(font.id, {
      name: name.trim(),
      company: company.trim() || undefined,
      download_url: url.trim() || undefined,
      is_free: isFree,
    })
    setSaving(false)
    if (r.error) { setError(r.error); return }
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  const cellInp = 'w-full rounded-lg border bg-transparent px-2 py-1 text-sm outline-none transition focus:border-purple-400 focus:ring-1 focus:ring-purple-100'
  const cellStyle = { borderColor: 'var(--bd)', color: 'var(--tx)' }

  return (
    <tr style={{ borderBottom: '1px solid var(--bd)' }}>
      <td className="w-14 py-2 ps-3 pe-2">
        <div className="h-8 w-12 overflow-hidden rounded-lg" style={{ background: 'var(--inp)' }}>
          {font.preview_image_url
            ? <img src={font.preview_image_url} alt="" className="h-full w-full object-cover" />
            : <div className="flex h-full items-center justify-center">
                <span className="text-xs font-black" style={{ color: 'rgba(124,58,237,.3)' }}>Aa</span>
              </div>
          }
        </div>
      </td>
      <td className="py-2 pe-2" style={{ minWidth: '120px' }}>
        <input value={name} onChange={e => setName(e.target.value)} className={cellInp} style={cellStyle} />
      </td>
      <td className="py-2 pe-2" style={{ minWidth: '100px' }}>
        <input value={company} onChange={e => setCompany(e.target.value)} placeholder="—"
          className={cellInp} style={cellStyle} />
      </td>
      <td className="py-2 pe-2" style={{ minWidth: '140px' }}>
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="—"
          dir="ltr" className={cellInp} style={cellStyle} />
      </td>
      <td className="py-2 pe-2 text-center">
        <input type="checkbox" checked={isFree} onChange={e => setIsFree(e.target.checked)}
          className="h-4 w-4 cursor-pointer accent-purple-600" />
      </td>
      <td className="py-2 pe-3">
        <div className="flex flex-wrap items-center gap-1">
          {isDirty && (
            <button onClick={save} disabled={saving || !name.trim()}
              className="rounded-lg px-2.5 py-1 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', minWidth: '42px' }}>
              {saving ? '...' : 'שמור'}
            </button>
          )}
          {saved && !isDirty && <span className="text-xs" style={{ color: '#10b981' }}>✓</span>}
          {error && <span className="text-[10px] text-red-400 max-w-[80px] truncate">{error}</span>}
          <FontFileUploadButton
            fontId={font.id}
            hasFile={!!font.font_file_path}
            getFontFileUploadUrl={getFontFileUploadUrl}
            generateFontPreview={generateFontPreview}
          />
          <button onClick={() => onEdit(font)}
            className="rounded-lg p-1.5 transition hover:bg-purple-500/10"
            style={{ color: 'var(--tx3)' }} title="ערוך מלא">
            <Pencil size={13} />
          </button>
          <button disabled={delPending}
            onClick={() => { if (confirm(`למחוק את "${font.name}"?`)) startDel(async () => { await deleteFont(font.id) }) }}
            className="rounded-lg p-1.5 transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
            style={{ color: 'var(--tx3)' }}>
            <Trash2 size={13} />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ── Main FontsTab ─────────────────────────────────────────────────────────────
export default function FontsTab({
  fonts, fontWeights, saveFont, deleteFont,
  getFontPreviewUploadUrl, getFontFileUploadUrl, generateFontPreview,
  createFontWithPreview, updateFontsCompany, quickUpdateFont, recomputeHashBatch,
}: Props) {
  const router = useRouter()
  const [saveState, saveAction, savePending] = useActionState(saveFont, null)
  const [showForm, setShowForm]         = useState(false)
  const [editingFont, setEditingFont]   = useState<Font | null>(null)
  const [search, setSearch]             = useState('')
  const [prefixGroups, setPrefixGroups] = useState<PrefixGroup[]>([])
  const [rehashStatus, setRehashStatus] = useState<'idle' | 'running' | 'done'>('idle')
  const [rehashProgress, setRehashProgress] = useState<{ processed: number; total: number; done: number; errors: number } | null>(null)

  const handleEdit   = (font: Font) => { setEditingFont(font); setShowForm(true) }
  const handleCancel = () => { setShowForm(false); setEditingFont(null) }

  const getWeightsFor = (fontId: string): WeightEntry[] =>
    fontWeights.filter(w => w.font_id === fontId).map(w => ({
      weight_name: w.weight_name,
      preview_image_url: w.preview_image_url ?? '',
      download_url: w.download_url ?? '',
    }))

  const handleBatchDone = useCallback((uploaded: { fontId: string; fontName: string; originalBaseName: string }[]) => {
    const groupMap: Record<string, { fontIds: string[] }> = {}
    for (const f of uploaded) {
      const m = f.originalBaseName.match(/^([A-Z]{2,4}[_-])/)
      if (m) {
        const prefix = m[1]
        if (!groupMap[prefix]) groupMap[prefix] = { fontIds: [] }
        groupMap[prefix].fontIds.push(f.fontId)
      }
    }
    const newGroups: PrefixGroup[] = Object.entries(groupMap).map(([prefix, { fontIds }]) => ({
      prefix, fontIds, company: '', url: '', applied: false,
    }))
    if (newGroups.length > 0) {
      setPrefixGroups(prev => [...prev.filter(g => g.applied), ...newGroups])
    }
    router.refresh()
  }, [router])

  const handleRehash = async () => {
    const BATCH = 20
    setRehashStatus('running')
    setRehashProgress({ processed: 0, total: 0, done: 0, errors: 0 })
    let offset = 0
    let totalDone = 0
    let totalErrors = 0
    while (true) {
      const r = await recomputeHashBatch(offset, BATCH)
      totalDone   += r.done
      totalErrors += r.errors
      const processed = offset + r.batchSize
      setRehashProgress({ processed, total: r.total, done: totalDone, errors: totalErrors })
      if (r.batchSize < BATCH || processed >= r.total) break
      offset += BATCH
    }
    setRehashStatus('done')
    setTimeout(() => { setRehashStatus('idle'); setRehashProgress(null) }, 8000)
  }

  const filteredFonts = fonts.filter(f => {
    const q = search.toLowerCase()
    return !q || f.name.toLowerCase().includes(q) ||
      (f.name_hebrew?.toLowerCase().includes(q) ?? false) ||
      (f.company?.toLowerCase().includes(q) ?? false)
  })

  return (
    <div>
      {/* ── Bulk upload ── */}
      <BulkUploadZone
        getFontFileUploadUrl={getFontFileUploadUrl}
        createFontWithPreview={createFontWithPreview}
        onBatchDone={handleBatchDone}
      />

      {/* ── Prefix groups ── */}
      {prefixGroups.some(g => !g.applied) && (
        <PrefixGroups
          groups={prefixGroups}
          updateFontsCompany={updateFontsCompany}
        />
      )}

      {/* ── Table toolbar ── */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1" style={{ minWidth: '160px' }}>
          <Search size={13} className="absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--tx3)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="חפש פונט, חברה..."
            className="w-full rounded-xl py-2 pe-3 ps-8 text-sm outline-none"
            style={{ background: 'var(--inp)', border: '1px solid var(--bd)', color: 'var(--tx)' }} />
        </div>
        <p className="text-sm" style={{ color: 'var(--tx3)' }}>{fonts.length} פונטים</p>
        <div className="flex flex-col items-end gap-0.5">
          <button
            onClick={handleRehash}
            disabled={rehashStatus === 'running'}
            title="חשב perceptual hash לכל תמונות ה-preview"
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition hover:opacity-80 disabled:opacity-50"
            style={{ background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.3)', color: '#059669' }}>
            {rehashStatus === 'running' ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            {rehashStatus === 'running'
              ? rehashProgress && rehashProgress.total > 0
                ? `${rehashProgress.processed}/${rehashProgress.total}`
                : 'מחשב...'
              : rehashStatus === 'done' ? '✓ הושלם' : 'חשב hashes'}
          </button>
          {rehashProgress && rehashStatus === 'running' && rehashProgress.total > 0 && (
            <div className="w-full overflow-hidden rounded-full" style={{ height: '3px', background: 'rgba(16,185,129,.15)' }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.round((rehashProgress.processed / rehashProgress.total) * 100)}%`, background: '#10b981' }}
              />
            </div>
          )}
          {rehashStatus === 'done' && rehashProgress && (
            <p className="text-[11px]" style={{ color: '#059669' }}>
              {rehashProgress.done} עודכנו{rehashProgress.errors > 0 ? ` · ${rehashProgress.errors} שגיאות` : ''}
            </p>
          )}
        </div>
        <button
          onClick={() => { setEditingFont(null); setShowForm(s => !s) }}
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-white transition hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
          {showForm && !editingFont ? <X size={13} /> : <Plus size={13} />}
          {showForm && !editingFont ? 'ביטול' : 'הוסף ידני'}
        </button>
      </div>

      {/* ── Add form (manual) ── */}
      {showForm && !editingFont && (
        <div className="mb-5">
          <FontForm editingFont={null} initialWeights={[]}
            saveAction={saveAction} savePending={savePending} saveState={saveState}
            onCancel={handleCancel} getFontPreviewUploadUrl={getFontPreviewUploadUrl} />
        </div>
      )}

      {/* ── Font table ── */}
      {filteredFonts.length === 0 ? (
        <div className="rounded-2xl py-14 text-center text-sm"
          style={{ border: '2px dashed var(--bd)', background: 'var(--inp)', color: 'var(--tx3)' }}>
          {fonts.length === 0 ? 'אין פונטים — גרור קבצי TTF/OTF למעלה להוספה מהירה' : 'לא נמצאו תוצאות'}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl" style={{ border: '1px solid var(--bd)' }}>
            <table className="w-full table-auto" style={{ background: 'var(--s2)' }}>
              <thead>
                <tr style={{ background: 'var(--inp)', borderBottom: '2px solid var(--bd)' }}>
                  <th className="py-2.5 ps-3 pe-2 w-14" />
                  <th className="py-2.5 pe-2 text-start text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--tx3)' }}>שם</th>
                  <th className="py-2.5 pe-2 text-start text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--tx3)' }}>חברה</th>
                  <th className="py-2.5 pe-2 text-start text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--tx3)' }}>אתר</th>
                  <th className="py-2.5 pe-2 text-center text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--tx3)' }}>חינמי</th>
                  <th className="py-2.5 pe-3 text-start text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--tx3)' }}>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {filteredFonts.map(font => (
                  <>
                    <FontTableRow
                      key={`row-${font.id}`}
                      font={font}
                      quickUpdateFont={quickUpdateFont}
                      deleteFont={deleteFont}
                      getFontFileUploadUrl={getFontFileUploadUrl}
                      generateFontPreview={generateFontPreview}
                      onEdit={handleEdit}
                    />
                    {showForm && editingFont?.id === font.id && (
                      <tr key={`edit-${font.id}`}>
                        <td colSpan={6} className="p-0 pb-2">
                          <FontForm
                            editingFont={editingFont}
                            initialWeights={getWeightsFor(editingFont.id)}
                            saveAction={saveAction}
                            savePending={savePending}
                            saveState={saveState}
                            onCancel={handleCancel}
                            getFontPreviewUploadUrl={getFontPreviewUploadUrl}
                          />
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

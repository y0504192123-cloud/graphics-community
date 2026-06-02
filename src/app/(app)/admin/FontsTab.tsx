'use client'

import { useState, useTransition, useActionState, useRef } from 'react'
import { Plus, Trash2, Pencil, X, ExternalLink, Search, Upload, ImageIcon, FileUp } from 'lucide-react'
import type { Font, FontWeight } from '@/types'

type SaveResult = { error?: string } | null

type WeightEntry = {
  weight_name: string
  preview_image_url: string
  download_url: string
}

type UploadFn = () => Promise<{ signedUrl?: string; publicUrl?: string; error?: string }>

type Props = {
  fonts: Font[]
  fontWeights: FontWeight[]
  saveFont: (prev: SaveResult, fd: FormData) => Promise<SaveResult>
  deleteFont: (id: string) => Promise<void>
  getFontPreviewUploadUrl: UploadFn
  getFontFileUploadUrl: (fileName: string) => Promise<{ signedUrl?: string; path?: string; error?: string }>
  generateFontPreview: (fontId: string, filePath: string) => Promise<{ error?: string; previewUrl?: string }>
}

const inp = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-100'
const lbl = 'mb-1 block text-[11px] font-semibold uppercase tracking-widest text-slate-500'

// ── Per-weight row with its own upload state ───────────────────────────────
function WeightRow({
  weight, onUpdate, onRemove, getUploadUrl,
}: {
  weight: WeightEntry
  onUpdate: (field: keyof WeightEntry, val: string) => void
  onRemove: () => void
  getUploadUrl: UploadFn
}) {
  const [uploading, setUploading]     = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileRef                       = useRef<HTMLInputElement>(null)

  const handleUpload = async (file: File) => {
    setUploading(true)
    setUploadError(null)
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

      {/* Weight name */}
      <input
        value={weight.weight_name}
        onChange={e => onUpdate('weight_name', e.target.value)}
        placeholder="שם משקל (Regular, Bold...)"
        className={inp}
        style={{ flex: '1 1 130px' }}
      />

      {/* Preview image: thumbnail + upload button */}
      <div className="flex shrink-0 items-center gap-2">
        {weight.preview_image_url ? (
          <div className="relative h-9 w-14 overflow-hidden rounded-lg"
            style={{ border: '1px solid var(--bd)' }}>
            <img src={weight.preview_image_url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onUpdate('preview_image_url', '')}
              className="absolute end-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-white"
            >
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
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition hover:opacity-80 disabled:opacity-40"
            style={{ background: 'var(--s1)', border: '1px solid var(--bd)', color: 'var(--tx2)' }}
          >
            <Upload size={11} />
            {uploading ? 'מעלה...' : 'תמונה'}
          </button>
          {uploadError && (
            <p className="max-w-[80px] text-[10px] leading-tight text-red-400">{uploadError}</p>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) handleUpload(file)
            if (fileRef.current) fileRef.current.value = ''
          }}
        />
      </div>

      {/* Download URL */}
      <input
        value={weight.download_url}
        onChange={e => onUpdate('download_url', e.target.value)}
        placeholder="URL הורדה"
        className={inp}
        dir="ltr"
        style={{ flex: '2 1 160px' }}
      />

      {/* Remove */}
      <button
        type="button"
        onClick={onRemove}
        className="mt-1 shrink-0 rounded-lg p-1.5 transition hover:bg-red-500/10 hover:text-red-400"
        style={{ color: 'var(--tx3)' }}
      >
        <X size={13} />
      </button>
    </div>
  )
}

// ── Font file upload (TTF/OTF → auto preview) ─────────────────────────────
type FontFileStatus = 'idle' | 'uploading' | 'generating' | 'done' | 'error'

function FontFileUploadButton({
  fontId,
  hasFile,
  getFontFileUploadUrl,
  generateFontPreview,
}: {
  fontId: string
  hasFile: boolean
  getFontFileUploadUrl: (name: string) => Promise<{ signedUrl?: string; path?: string; error?: string }>
  generateFontPreview: (fontId: string, filePath: string) => Promise<{ error?: string; previewUrl?: string }>
}) {
  const [status, setStatus]   = useState<FontFileStatus>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const fileRef               = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setStatus('uploading')
    setErrorMsg(null)
    try {
      const { signedUrl, path, error } = await getFontFileUploadUrl(file.name)
      if (error || !signedUrl || !path) { setStatus('error'); setErrorMsg(error ?? 'שגיאה'); return }

      const res = await fetch(signedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type || 'font/ttf' },
      })
      if (!res.ok) { setStatus('error'); setErrorMsg('העלאה נכשלה'); return }

      setStatus('generating')
      const result = await generateFontPreview(fontId, path)
      if (result.error) { setStatus('error'); setErrorMsg(result.error); return }

      setStatus('done')
      setTimeout(() => setStatus('idle'), 3000)
    } catch { setStatus('error'); setErrorMsg('שגיאת רשת') }
  }

  const busy = status === 'uploading' || status === 'generating'

  const label: Record<FontFileStatus, string> = {
    idle:       hasFile ? 'החלף קובץ פונט' : 'העלה קובץ פונט',
    uploading:  'מעלה...',
    generating: 'מחולל preview...',
    done:       'Preview נוצר ✓',
    error:      'נסה שנית',
  }

  return (
    <div className="flex flex-col items-start gap-0.5">
      <button
        type="button"
        disabled={busy}
        onClick={() => fileRef.current?.click()}
        title="העלה קובץ TTF/OTF — Preview נוצר אוטומטית"
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition hover:opacity-80 disabled:opacity-40"
        style={{
          background: status === 'done'  ? 'rgba(16,185,129,.1)'
                    : status === 'error' ? 'rgba(239,68,68,.08)'
                    : 'var(--inp)',
          border: `1px solid ${
            status === 'done'  ? 'rgba(16,185,129,.3)'
          : status === 'error' ? 'rgba(239,68,68,.3)'
          : 'var(--bd)'}`,
          color: status === 'done'  ? '#059669'
               : status === 'error' ? '#ef4444'
               : 'var(--tx2)',
        }}
      >
        <FileUp size={12} />
        {label[status]}
      </button>
      {errorMsg && <p className="max-w-[120px] text-[10px] leading-tight text-red-400">{errorMsg}</p>}
      <input
        ref={fileRef}
        type="file"
        accept=".ttf,.otf"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          if (fileRef.current) fileRef.current.value = ''
        }}
      />
    </div>
  )
}

// ── Font add/edit form ─────────────────────────────────────────────────────
type FontFormProps = {
  editingFont: Font | null
  initialWeights: WeightEntry[]
  saveAction: (fd: FormData) => void
  savePending: boolean
  saveState: SaveResult
  onCancel: () => void
  getFontPreviewUploadUrl: UploadFn
}

function FontForm({
  editingFont, initialWeights,
  saveAction, savePending, saveState, onCancel,
  getFontPreviewUploadUrl,
}: FontFormProps) {
  const [isFree, setIsFree]           = useState(editingFont?.is_free ?? true)
  const [previewUrl, setPreviewUrl]   = useState(editingFont?.preview_image_url ?? '')
  const [uploading, setUploading]     = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [weights, setWeights]         = useState<WeightEntry[]>(initialWeights)
  const previewFileRef                = useRef<HTMLInputElement>(null)

  const handlePreviewUpload = async (file: File) => {
    setUploading(true)
    setUploadError(null)
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
    <form
      key={editingFont?.id ?? 'new'}
      action={saveAction}
      className="space-y-4 rounded-2xl p-5"
      style={{ background: 'rgba(124,58,237,.05)', border: '1px solid rgba(124,58,237,.2)' }}
    >
      {editingFont && <input type="hidden" name="id" value={editingFont.id} />}
      <input type="hidden" name="preview_image_url" value={previewUrl} />
      <input type="hidden" name="weights" value={JSON.stringify(weights)} />

      {saveState?.error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{saveState.error}</p>
      )}

      {/* Basic fields */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={lbl}>שם הפונט (באנגלית) *</label>
          <input name="name" required className={inp} defaultValue={editingFont?.name ?? ''} placeholder="Almoni" />
        </div>
        <div>
          <label className={lbl}>שם בעברית</label>
          <input name="name_hebrew" className={inp} defaultValue={editingFont?.name_hebrew ?? ''} placeholder="אלמוני" />
        </div>
        <div>
          <label className={lbl}>חברה / יוצר</label>
          <input name="company" className={inp} defaultValue={editingFont?.company ?? ''} placeholder="Masterfont" />
        </div>
        <div>
          <label className={lbl}>קטגוריה</label>
          <input name="category" className={inp} defaultValue={editingFont?.category ?? ''} placeholder="serif / sans-serif / display..." />
        </div>
        <div>
          <label className={lbl}>סגנון</label>
          <input name="style" className={inp} defaultValue={editingFont?.style ?? ''} placeholder="Bold, Regular, Light..." />
        </div>
        <div>
          <label className={lbl}>תגיות (מופרדות בפסיקים)</label>
          <input name="tags" className={inp} defaultValue={editingFont?.tags?.join(', ') ?? ''} placeholder="עברית, כותרת, מודרני" />
        </div>
      </div>

      {/* Download URL */}
      <div>
        <label className={lbl}>קישור הורדה / רכישה</label>
        <input name="download_url" type="url" className={inp} dir="ltr"
          defaultValue={editingFont?.download_url ?? ''} placeholder="https://..." />
      </div>

      {/* Font preview image upload */}
      <div>
        <label className={lbl}>תמונת תצוגה מקדימה</label>
        <div className="flex items-start gap-3">
          {previewUrl ? (
            <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl"
              style={{ border: '1px solid var(--bd)' }}>
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
            <button
              type="button"
              disabled={uploading}
              onClick={() => previewFileRef.current?.click()}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition hover:opacity-80 disabled:opacity-50"
              style={{ background: 'var(--inp)', border: '1px solid var(--bd)', color: 'var(--tx2)' }}
            >
              <Upload size={14} />
              {uploading ? 'מעלה...' : previewUrl ? 'החלף תמונה' : 'העלה תמונה'}
            </button>
            {uploadError && <p className="mt-1 text-xs text-red-400">{uploadError}</p>}
            <p className="mt-1 text-[11px]" style={{ color: 'var(--tx3)' }}>PNG, JPG, WebP</p>
          </div>
        </div>
        <input
          ref={previewFileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) handlePreviewUpload(file)
            if (previewFileRef.current) previewFileRef.current.value = ''
          }}
        />
      </div>

      {/* Description */}
      <div>
        <label className={lbl}>תיאור</label>
        <textarea name="description" rows={2} className={`${inp} resize-none`}
          defaultValue={editingFont?.description ?? ''} placeholder="תיאור קצר של הפונט..." />
      </div>

      {/* Free / paid */}
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium" style={{ color: 'var(--tx)' }}>
          <input
            type="checkbox"
            name="is_free"
            checked={isFree}
            onChange={e => setIsFree(e.target.checked)}
            className="h-4 w-4 rounded accent-purple-600"
          />
          פונט חינמי
        </label>
        {!isFree && (
          <div className="flex items-center gap-2">
            <label className={`${lbl} mb-0`}>מחיר</label>
            <input name="price" className={`${inp} w-32`}
              defaultValue={editingFont?.price ?? ''} placeholder="₪99 / $19..." />
          </div>
        )}
      </div>

      {/* Weights */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className={`${lbl} mb-0`}>משקלים / גרסאות</label>
          <button
            type="button"
            onClick={addWeight}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition hover:opacity-80"
            style={{ background: 'rgba(124,58,237,.1)', color: '#7c3aed' }}
          >
            <Plus size={12} />
            הוסף משקל
          </button>
        </div>

        {weights.length === 0 ? (
          <p className="rounded-xl py-3 text-center text-xs"
            style={{ background: 'var(--inp)', color: 'var(--tx3)' }}>
            אין משקלים — לחץ "הוסף משקל" להוספה
          </p>
        ) : (
          <div className="space-y-2">
            {weights.map((w, i) => (
              <WeightRow
                key={i}
                weight={w}
                onUpdate={(field, val) => updateWeight(i, field, val)}
                onRemove={() => removeWeight(i)}
                getUploadUrl={getFontPreviewUploadUrl}
              />
            ))}
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={savePending}
          className="flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}
        >
          <Plus size={14} />
          {savePending ? 'שומר...' : editingFont ? 'עדכן פונט' : 'הוסף פונט'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border px-4 py-2 text-sm font-medium transition hover:bg-slate-100"
          style={{ borderColor: 'var(--bd)', color: 'var(--tx2)' }}
        >
          ביטול
        </button>
      </div>
    </form>
  )
}

// ── Main tab component ─────────────────────────────────────────────────────
export default function FontsTab({ fonts, fontWeights, saveFont, deleteFont, getFontPreviewUploadUrl, getFontFileUploadUrl, generateFontPreview }: Props) {
  const [saveState, saveAction, savePending] = useActionState(saveFont, null)
  const [isPending, startTransition]         = useTransition()
  const [showForm, setShowForm]              = useState(false)
  const [editingFont, setEditingFont]        = useState<Font | null>(null)
  const [search, setSearch]                  = useState('')

  const handleEdit = (font: Font) => { setEditingFont(font); setShowForm(true) }
  const handleCancel = () => { setShowForm(false); setEditingFont(null) }

  const getWeightsFor = (fontId: string): WeightEntry[] =>
    fontWeights
      .filter(w => w.font_id === fontId)
      .map(w => ({
        weight_name:       w.weight_name,
        preview_image_url: w.preview_image_url ?? '',
        download_url:      w.download_url ?? '',
      }))

  const filteredFonts = fonts.filter(f => {
    const q = search.toLowerCase()
    return !q || f.name.toLowerCase().includes(q) || (f.name_hebrew?.toLowerCase().includes(q) ?? false)
  })

  return (
    <div>

      {/* Toolbar */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="relative flex-1" style={{ minWidth: '160px' }}>
          <Search size={13} className="absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--tx3)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="חפש פונט..."
            className="w-full rounded-xl py-2 pe-3 ps-8 text-sm outline-none"
            style={{ background: 'var(--inp)', border: '1px solid var(--bd)', color: 'var(--tx)' }}
          />
        </div>
        <p className="text-sm" style={{ color: 'var(--tx3)' }}>{fonts.length} פונטים</p>
        <button
          onClick={() => { setEditingFont(null); setShowForm(s => !s) }}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white transition hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}
        >
          {showForm && !editingFont ? <X size={14} /> : <Plus size={14} />}
          {showForm && !editingFont ? 'ביטול' : 'פונט חדש'}
        </button>
      </div>

      {/* Add form */}
      {showForm && !editingFont && (
        <div className="mb-6">
          <FontForm
            editingFont={null}
            initialWeights={[]}
            saveAction={saveAction}
            savePending={savePending}
            saveState={saveState}
            onCancel={handleCancel}
            getFontPreviewUploadUrl={getFontPreviewUploadUrl}
          />
        </div>
      )}

      {/* Font list */}
      <div className="space-y-2">
        {filteredFonts.length === 0 ? (
          <div className="rounded-2xl py-14 text-center text-sm"
            style={{ border: '2px dashed var(--bd)', background: 'var(--inp)', color: 'var(--tx3)' }}>
            {fonts.length === 0 ? 'אין פונטים — לחץ "פונט חדש" להוספה' : 'לא נמצאו תוצאות'}
          </div>
        ) : (
          filteredFonts.map(font => {
            const weights = getWeightsFor(font.id)
            return (
              <div key={font.id}>
                <div
                  className="flex items-center gap-3 rounded-xl px-4 py-3"
                  style={{ background: 'var(--s2)', border: '1px solid var(--bd)' }}
                >
                  {/* Preview thumbnail */}
                  <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg" style={{ background: 'var(--inp)' }}>
                    {font.preview_image_url ? (
                      <img src={font.preview_image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <span className="select-none text-lg font-black"
                          style={{ color: 'rgba(124,58,237,.3)', fontFamily: 'Georgia,serif' }}>Aa</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-semibold" style={{ color: 'var(--tx)' }}>{font.name}</span>
                      {font.name_hebrew && (
                        <span className="text-sm" style={{ color: 'var(--tx2)' }}>{font.name_hebrew}</span>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs" style={{ color: 'var(--tx3)' }}>
                      {font.company && <span>{font.company}</span>}
                      {font.category && <span>· {font.category}</span>}
                      {weights.length > 0 && (
                        <span className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                          style={{ background: 'rgba(124,58,237,.1)', color: '#7c3aed' }}>
                          {weights.length} משקלים
                        </span>
                      )}
                      <span
                        className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                        style={font.is_free
                          ? { background: 'rgba(16,185,129,.12)', color: '#059669' }
                          : { background: 'rgba(245,158,11,.12)', color: '#b45309' }
                        }
                      >
                        {font.is_free ? 'חינמי' : (font.price ?? 'בתשלום')}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 flex-wrap items-center gap-1">
                    <FontFileUploadButton
                      fontId={font.id}
                      hasFile={!!font.font_file_path}
                      getFontFileUploadUrl={getFontFileUploadUrl}
                      generateFontPreview={generateFontPreview}
                    />
                    {font.download_url && (
                      <a href={font.download_url} target="_blank" rel="noopener noreferrer"
                        className="rounded-lg p-1.5 transition hover:bg-purple-500/10"
                        style={{ color: 'var(--tx3)' }} title="פתח קישור">
                        <ExternalLink size={14} />
                      </a>
                    )}
                    <button onClick={() => handleEdit(font)}
                      className="rounded-lg p-1.5 transition hover:bg-purple-500/10"
                      style={{ color: 'var(--tx3)' }} title="ערוך">
                      <Pencil size={14} />
                    </button>
                    <button
                      disabled={isPending}
                      onClick={() => {
                        if (confirm(`למחוק את "${font.name}"?`))
                          startTransition(async () => { await deleteFont(font.id) })
                      }}
                      className="rounded-lg p-1.5 transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                      style={{ color: 'var(--tx3)' }} title="מחק">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Inline edit form */}
                {showForm && editingFont?.id === font.id && (
                  <div className="mt-2">
                    <FontForm
                      editingFont={editingFont}
                      initialWeights={getWeightsFor(editingFont.id)}
                      saveAction={saveAction}
                      savePending={savePending}
                      saveState={saveState}
                      onCancel={handleCancel}
                      getFontPreviewUploadUrl={getFontPreviewUploadUrl}
                    />
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

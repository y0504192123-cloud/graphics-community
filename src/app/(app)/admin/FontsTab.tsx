'use client'

import { useState, useTransition, useActionState } from 'react'
import { Plus, Trash2, Pencil, X, ExternalLink, Search } from 'lucide-react'
import type { Font } from '@/types'

type SaveResult = { error?: string } | null

type Props = {
  fonts: Font[]
  saveFont:   (prev: SaveResult, fd: FormData) => Promise<SaveResult>
  deleteFont: (id: string) => Promise<void>
}

const inp = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-100'
const lbl = 'mb-1 block text-[11px] font-semibold uppercase tracking-widest text-slate-500'

function FontForm({
  editingFont,
  saveAction,
  savePending,
  saveState,
  onCancel,
}: {
  editingFont: Font | null
  saveAction:  (fd: FormData) => void
  savePending: boolean
  saveState:   SaveResult
  onCancel:    () => void
}) {
  const [isFree, setIsFree] = useState(editingFont?.is_free ?? true)

  return (
    <form
      key={editingFont?.id ?? 'new'}
      action={saveAction}
      className="rounded-2xl p-5 space-y-4"
      style={{ background: 'rgba(124,58,237,.05)', border: '1px solid rgba(124,58,237,.2)' }}
    >
      {editingFont && <input type="hidden" name="id" value={editingFont.id} />}

      {saveState?.error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{saveState.error}</p>
      )}

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

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={lbl}>קישור הורדה / רכישה</label>
          <input name="download_url" type="url" className={inp} dir="ltr" defaultValue={editingFont?.download_url ?? ''} placeholder="https://..." />
        </div>
        <div>
          <label className={lbl}>קישור תמונת תצוגה מקדימה</label>
          <input name="preview_image_url" type="url" className={inp} dir="ltr" defaultValue={editingFont?.preview_image_url ?? ''} placeholder="https://..." />
        </div>
      </div>

      <div>
        <label className={lbl}>תיאור</label>
        <textarea name="description" rows={2} className={`${inp} resize-none`}
          defaultValue={editingFont?.description ?? ''} placeholder="תיאור קצר של הפונט..." />
      </div>

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
            <input name="price" className={`${inp} w-32`} defaultValue={editingFont?.price ?? ''} placeholder="₪99 / $19..." />
          </div>
        )}
      </div>

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

export default function FontsTab({ fonts, saveFont, deleteFont }: Props) {
  const [saveState, saveAction, savePending] = useActionState(saveFont, null)
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm]       = useState(false)
  const [editingFont, setEditingFont] = useState<Font | null>(null)
  const [search, setSearch]           = useState('')

  const handleEdit = (font: Font) => {
    setEditingFont(font)
    setShowForm(true)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingFont(null)
  }

  const filteredFonts = fonts.filter(f => {
    const q = search.toLowerCase()
    return !q || f.name.toLowerCase().includes(q) || (f.name_hebrew?.toLowerCase().includes(q) ?? false)
  })

  return (
    <div>

      {/* Toolbar */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-40">
          <Search size={13} className="absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--tx3)' }} />
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
            saveAction={saveAction}
            savePending={savePending}
            saveState={saveState}
            onCancel={handleCancel}
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
          filteredFonts.map(font => (
            <div key={font.id}>
              <div
                className="flex items-center gap-3 rounded-xl px-4 py-3"
                style={{ background: 'var(--s2)', border: '1px solid var(--bd)' }}
              >
                {/* Preview thumbnail */}
                <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg"
                  style={{ background: 'var(--inp)' }}>
                  {font.preview_image_url ? (
                    <img src={font.preview_image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <span className="text-lg font-black select-none"
                        style={{ color: 'rgba(124,58,237,.3)', fontFamily: 'Georgia,serif' }}>Aa</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="font-semibold" style={{ color: 'var(--tx)' }}>{font.name}</span>
                    {font.name_hebrew && (
                      <span className="text-sm" style={{ color: 'var(--tx2)' }}>{font.name_hebrew}</span>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs" style={{ color: 'var(--tx3)' }}>
                    {font.company && <span>{font.company}</span>}
                    {font.category && <span>· {font.category}</span>}
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
                <div className="flex shrink-0 items-center gap-1">
                  {font.download_url && (
                    <a
                      href={font.download_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg p-1.5 transition hover:bg-purple-500/10"
                      style={{ color: 'var(--tx3)' }}
                      title="פתח קישור"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                  <button
                    onClick={() => handleEdit(font)}
                    className="rounded-lg p-1.5 transition hover:bg-purple-500/10"
                    style={{ color: 'var(--tx3)' }}
                    title="ערוך"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    disabled={isPending}
                    onClick={() => {
                      if (confirm(`למחוק את "${font.name}"?`))
                        startTransition(async () => { await deleteFont(font.id) })
                    }}
                    className="rounded-lg p-1.5 transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                    style={{ color: 'var(--tx3)' }}
                    title="מחק"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Inline edit form */}
              {showForm && editingFont?.id === font.id && (
                <div className="mt-2">
                  <FontForm
                    editingFont={editingFont}
                    saveAction={saveAction}
                    savePending={savePending}
                    saveState={saveState}
                    onCancel={handleCancel}
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { getChallengeEmailHtml, sendTestChallengeEmail } from '../../forum/actions'
import { Send, Eye, RefreshCw, ChevronLeft, Mail, ArrowRight } from 'lucide-react'

interface Thread {
  id: string
  title: string
  category_id: string
  images: string[] | null
  image_url: string | null
}

export default function EmailPreviewClient({ threads }: { threads: Thread[] }) {
  const [selectedId, setSelectedId] = useState(threads[0]?.id ?? '')
  const [html, setHtml] = useState<string | null>(null)
  const [loadingHtml, setLoadingHtml] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ msg: string; ok: boolean } | null>(null)

  const selectedThread = threads.find(t => t.id === selectedId)

  const loadPreview = async () => {
    if (!selectedId || !selectedThread) return
    setLoadingHtml(true)
    setHtml(null)
    setSendResult(null)
    const result = await getChallengeEmailHtml(selectedId, selectedThread.category_id)
    setHtml(result || '<p style="padding:40px;text-align:center;color:#94a3b8">שגיאה בטעינה</p>')
    setLoadingHtml(false)
  }

  const handleSendTest = async () => {
    if (!selectedId || !selectedThread || sending) return
    setSending(true)
    setSendResult(null)
    const result = await sendTestChallengeEmail(selectedId, selectedThread.category_id)
    setSendResult(result.error
      ? { msg: result.error, ok: false }
      : { msg: 'נשלח בהצלחה ל-y0504192123@gmail.com ✅', ok: true }
    )
    setSending(false)
  }

  return (
    <div className="min-h-full" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="relative overflow-hidden px-6 pb-6 pt-6" style={{ background: 'var(--hero)' }}>
        <div className="grid-pattern absolute inset-0 opacity-40" />
        <div className="relative mx-auto max-w-5xl">
          <nav className="mb-2 flex items-center gap-1.5 text-xs" style={{ color: 'var(--tx3)' }}>
            <Link href="/admin" className="hover:text-purple-600 transition">ניהול</Link>
            <ChevronLeft size={11} />
            <span style={{ color: 'var(--tx2)' }}>תצוגה מקדימה — מייל אתגר</span>
          </nav>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl"
              style={{ background: 'linear-gradient(135deg,#d97706,#b45309)', boxShadow: '0 4px 16px rgba(180,83,9,.35)' }}>
              <Mail size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--tx)' }}>תצוגה מקדימה — מייל אתגר שבועי</h1>
              <p className="text-sm" style={{ color: 'var(--tx3)' }}>בחר אתגר, תצוגה מקדימה ושלח ניסיון</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6 space-y-5">
        {/* Controls bar */}
        <div className="flex flex-wrap items-center gap-3 rounded-2xl p-4"
          style={{ background: 'var(--s1)', border: '1px solid var(--bd)' }}>

          {/* Dropdown */}
          <div className="relative flex-1 min-w-[220px]">
            <select
              value={selectedId}
              onChange={e => { setSelectedId(e.target.value); setHtml(null); setSendResult(null) }}
              className="w-full appearance-none rounded-xl px-4 py-2.5 text-sm font-medium outline-none"
              style={{ background: 'var(--inp)', border: '1px solid var(--bd)', color: 'var(--tx)' }}
            >
              {threads.length === 0 && <option value="">אין אתגרים זמינים</option>}
              {threads.map(t => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
            <ArrowRight size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none rotate-90"
              style={{ color: 'var(--tx3)' }} />
          </div>

          <button
            onClick={loadPreview}
            disabled={!selectedId || loadingHtml}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', boxShadow: '0 4px 14px rgba(124,58,237,.3)' }}
          >
            {loadingHtml
              ? <><RefreshCw size={14} className="animate-spin" /> טוען...</>
              : <><Eye size={14} /> תצוגה מקדימה</>
            }
          </button>

          <button
            onClick={handleSendTest}
            disabled={!selectedId || sending}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,#d97706,#b45309)', boxShadow: '0 4px 14px rgba(180,83,9,.3)' }}
          >
            {sending
              ? <><RefreshCw size={14} className="animate-spin" /> שולח...</>
              : <><Send size={14} /> שלח לי ניסיון</>
            }
          </button>
        </div>

        {/* Send result */}
        {sendResult && (
          <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold"
            style={{
              background: sendResult.ok ? 'rgba(16,185,129,.08)' : 'rgba(239,68,68,.08)',
              border: `1px solid ${sendResult.ok ? 'rgba(16,185,129,.25)' : 'rgba(239,68,68,.25)'}`,
              color: sendResult.ok ? '#059669' : '#ef4444',
            }}>
            {sendResult.msg}
          </div>
        )}

        {/* Preview */}
        {html && (
          <div className="overflow-hidden rounded-2xl"
            style={{ border: '1px solid var(--bd)', boxShadow: '0 4px 24px rgba(0,0,0,.06)' }}>
            {/* Browser chrome */}
            <div className="flex items-center gap-3 px-4 py-2.5"
              style={{ background: 'var(--s1)', borderBottom: '1px solid var(--bd)' }}>
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full" style={{ background: '#ef4444' }} />
                <div className="h-3 w-3 rounded-full" style={{ background: '#f59e0b' }} />
                <div className="h-3 w-3 rounded-full" style={{ background: '#22c55e' }} />
              </div>
              <div className="flex-1 rounded-lg px-3 py-1 text-xs text-center"
                style={{ background: 'var(--inp)', border: '1px solid var(--bd)', color: 'var(--tx3)' }}>
                תצוגה מקדימה — {selectedThread?.title}
              </div>
            </div>
            <iframe
              srcDoc={html}
              style={{ width: '100%', height: '720px', border: 'none', display: 'block', background: '#f1f5f9' }}
              title="Email preview"
            />
          </div>
        )}

        {/* Empty state */}
        {!html && !loadingHtml && (
          <div className="flex flex-col items-center gap-3 rounded-2xl py-24 text-center"
            style={{ background: 'var(--s1)', border: '2px dashed var(--bd)' }}>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl text-4xl"
              style={{ background: 'rgba(217,119,6,.08)', border: '1px solid rgba(217,119,6,.15)' }}>
              📧
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--tx2)' }}>
              בחר אתגר ולחץ "תצוגה מקדימה"
            </p>
            <p className="text-xs" style={{ color: 'var(--tx3)' }}>
              המייל יוצג בדפדפן כפי שיראה לנמענים
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

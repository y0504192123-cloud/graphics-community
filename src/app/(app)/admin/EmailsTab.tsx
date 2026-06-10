'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Send, Eye, RefreshCw, ExternalLink, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react'
import {
  getApprovalEmailHtml,
  sendTestApprovalEmail,
  getChallengeThreadsList,
  getAdminChallengeEmailHtml,
  sendAdminTestChallengeEmail,
} from './emailActions'

type Thread = { id: string; title: string; category_id: string }
type Status = { msg: string; ok: boolean } | null

function PreviewFrame({ html }: { html: string }) {
  return (
    <div className="overflow-hidden rounded-xl" style={{ border: '1px solid var(--bd)' }}>
      <div className="flex items-center gap-2 px-3 py-2" style={{ background: 'var(--inp)', borderBottom: '1px solid var(--bd)' }}>
        <div className="flex gap-1">
          <div className="h-2.5 w-2.5 rounded-full" style={{ background: '#ef4444' }} />
          <div className="h-2.5 w-2.5 rounded-full" style={{ background: '#f59e0b' }} />
          <div className="h-2.5 w-2.5 rounded-full" style={{ background: '#22c55e' }} />
        </div>
        <span className="text-[11px]" style={{ color: 'var(--tx3)' }}>תצוגה מקדימה</span>
      </div>
      <iframe
        srcDoc={html}
        style={{ width: '100%', height: '500px', border: 'none', display: 'block', background: '#f1f5f9' }}
        title="Email preview"
      />
    </div>
  )
}

function StatusBadge({ status }: { status: Status }) {
  if (!status) return null
  return (
    <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold"
      style={{
        background: status.ok ? 'rgba(16,185,129,.08)' : 'rgba(239,68,68,.08)',
        border: `1px solid ${status.ok ? 'rgba(16,185,129,.25)' : 'rgba(239,68,68,.25)'}`,
        color: status.ok ? '#059669' : '#ef4444',
      }}>
      {status.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
      {status.msg}
    </div>
  )
}

export default function EmailsTab() {
  // Approval email state
  const [approvalHtml, setApprovalHtml] = useState<string | null>(null)
  const [approvalLoading, setApprovalLoading] = useState(false)
  const [approvalSending, setApprovalSending] = useState(false)
  const [approvalStatus, setApprovalStatus] = useState<Status>(null)

  // Challenge email state
  const [threads, setThreads] = useState<Thread[]>([])
  const [selectedThreadId, setSelectedThreadId] = useState('')
  const [challengeHtml, setChallengeHtml] = useState<string | null>(null)
  const [challengeLoading, setChallengeLoading] = useState(false)
  const [challengeSending, setChallengeSending] = useState(false)
  const [challengeStatus, setChallengeStatus] = useState<Status>(null)

  useEffect(() => {
    getChallengeThreadsList().then(list => {
      setThreads(list)
      if (list[0]) setSelectedThreadId(list[0].id)
    })
  }, [])

  const selectedThread = threads.find(t => t.id === selectedThreadId)

  const loadApprovalPreview = async () => {
    setApprovalLoading(true)
    setApprovalHtml(null)
    const html = await getApprovalEmailHtml()
    setApprovalHtml(html || '<p style="padding:40px;text-align:center;color:#94a3b8">שגיאה בטעינה</p>')
    setApprovalLoading(false)
  }

  const handleSendApproval = async () => {
    if (approvalSending) return
    setApprovalSending(true)
    setApprovalStatus(null)
    const { error } = await sendTestApprovalEmail()
    setApprovalStatus(error
      ? { msg: error, ok: false }
      : { msg: 'נשלח ל-y0504192123@gmail.com ✓', ok: true }
    )
    setApprovalSending(false)
  }

  const loadChallengePreview = async () => {
    if (!selectedThread) return
    setChallengeLoading(true)
    setChallengeHtml(null)
    const html = await getAdminChallengeEmailHtml(selectedThread.id, selectedThread.category_id)
    setChallengeHtml(html || '<p style="padding:40px;text-align:center;color:#94a3b8">שגיאה בטעינה</p>')
    setChallengeLoading(false)
  }

  const handleSendChallenge = async () => {
    if (!selectedThread || challengeSending) return
    setChallengeSending(true)
    setChallengeStatus(null)
    const { error } = await sendAdminTestChallengeEmail(selectedThread.id, selectedThread.category_id)
    setChallengeStatus(error
      ? { msg: error, ok: false }
      : { msg: 'נשלח ל-y0504192123@gmail.com ✓', ok: true }
    )
    setChallengeSending(false)
  }

  return (
    <div className="space-y-8">

      {/* Link to full preview page */}
      <div className="flex items-center justify-between rounded-2xl px-5 py-4"
        style={{ background: 'linear-gradient(135deg,rgba(217,119,6,.06),rgba(180,83,9,.04))', border: '1px solid rgba(217,119,6,.2)' }}>
        <div>
          <p className="text-sm font-bold" style={{ color: '#92400e' }}>תצוגה מקדימה מורחבת של מיילים</p>
          <p className="text-xs mt-0.5" style={{ color: '#b45309' }}>בחר אתגר, צפה במייל בגודל מלא ושלח ניסיון</p>
        </div>
        <Link
          href="/admin/email-preview"
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#d97706,#b45309)', boxShadow: '0 4px 14px rgba(180,83,9,.3)' }}
        >
          פתח
          <ExternalLink size={14} />
        </Link>
      </div>

      {/* ── Approval email ── */}
      <section className="rounded-2xl overflow-hidden" style={{ background: 'var(--s2)', border: '1px solid var(--bd)' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--bd)', background: 'linear-gradient(to left,rgba(107,33,168,.05),transparent)' }}>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl text-base"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
              ✅
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--tx)' }}>מייל אישור הצטרפות</p>
              <p className="text-xs" style={{ color: 'var(--tx3)' }}>נשלח אוטומטית עם אישור בקשת הצטרפות</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadApprovalPreview}
              disabled={approvalLoading}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}
            >
              {approvalLoading ? <RefreshCw size={12} className="animate-spin" /> : <Eye size={12} />}
              תצוגה מקדימה
            </button>
            <button
              onClick={handleSendApproval}
              disabled={approvalSending}
              className="flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition hover:opacity-80 disabled:opacity-50"
              style={{ borderColor: 'rgba(124,58,237,.3)', color: '#7c3aed', background: 'rgba(124,58,237,.06)' }}
            >
              {approvalSending ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
              שלח לי ניסיון
            </button>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <StatusBadge status={approvalStatus} />
          {approvalHtml && <PreviewFrame html={approvalHtml} />}
          {!approvalHtml && !approvalLoading && (
            <div className="flex flex-col items-center gap-2 py-10 text-center" style={{ border: '2px dashed var(--bd)', borderRadius: 12 }}>
              <Eye size={24} className="text-slate-300" />
              <p className="text-xs" style={{ color: 'var(--tx3)' }}>לחץ "תצוגה מקדימה" לטעינת המייל</p>
            </div>
          )}
        </div>
      </section>

      {/* ── Challenge email ── */}
      <section className="rounded-2xl overflow-hidden" style={{ background: 'var(--s2)', border: '1px solid var(--bd)' }}>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4" style={{ borderBottom: '1px solid var(--bd)', background: 'linear-gradient(to left,rgba(217,119,6,.05),transparent)' }}>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl text-base"
              style={{ background: 'linear-gradient(135deg,#d97706,#b45309)' }}>
              🎯
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--tx)' }}>מייל אתגר שבועי</p>
              <p className="text-xs" style={{ color: 'var(--tx3)' }}>נשלח ידנית עם פרסום אתגר חדש</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Thread dropdown */}
            <select
              value={selectedThreadId}
              onChange={e => { setSelectedThreadId(e.target.value); setChallengeHtml(null); setChallengeStatus(null) }}
              className="rounded-xl px-3 py-2 text-xs font-medium outline-none"
              style={{ background: 'var(--inp)', border: '1px solid var(--bd)', color: 'var(--tx)', maxWidth: 200 }}
            >
              {threads.length === 0 && <option value="">אין אתגרים</option>}
              {threads.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
            <button
              onClick={loadChallengePreview}
              disabled={!selectedThreadId || challengeLoading}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#d97706,#b45309)' }}
            >
              {challengeLoading ? <RefreshCw size={12} className="animate-spin" /> : <Eye size={12} />}
              תצוגה מקדימה
            </button>
            <button
              onClick={handleSendChallenge}
              disabled={!selectedThreadId || challengeSending}
              className="flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition hover:opacity-80 disabled:opacity-50"
              style={{ borderColor: 'rgba(217,119,6,.3)', color: '#b45309', background: 'rgba(217,119,6,.06)' }}
            >
              {challengeSending ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
              שלח לי ניסיון
            </button>
            <Link
              href="/admin/email-preview"
              className="flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-semibold transition hover:opacity-80"
              style={{ borderColor: 'var(--bd)', color: 'var(--tx2)' }}
            >
              <ArrowLeft size={12} />
              מסך מלא
            </Link>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <StatusBadge status={challengeStatus} />
          {challengeHtml && <PreviewFrame html={challengeHtml} />}
          {!challengeHtml && !challengeLoading && (
            <div className="flex flex-col items-center gap-2 py-10 text-center" style={{ border: '2px dashed var(--bd)', borderRadius: 12 }}>
              <Eye size={24} className="text-slate-300" />
              <p className="text-xs" style={{ color: 'var(--tx3)' }}>בחר אתגר ולחץ "תצוגה מקדימה"</p>
            </div>
          )}
        </div>
      </section>

    </div>
  )
}

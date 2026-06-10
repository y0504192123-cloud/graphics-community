'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, Mail, MailX, Users } from 'lucide-react'
import { getMailingListUsers, toggleUserSubscription, type MailingUser } from './emailActions'

function dName(u: MailingUser) {
  return u.full_name || u.username || u.email || '—'
}

export default function MailingListTab() {
  const [users, setUsers] = useState<MailingUser[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getMailingListUsers().then(list => { setUsers(list); setLoading(false) })
  }, [])

  const subscribed = users.filter(u => !u.unsubscribed_emails)
  const unsubscribed = users.filter(u => u.unsubscribed_emails)

  async function handleToggle(u: MailingUser) {
    setToggling(u.id)
    setError(null)
    const newVal = !u.unsubscribed_emails
    const { error: err } = await toggleUserSubscription(u.id, newVal)
    if (err) {
      setError(err)
    } else {
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, unsubscribed_emails: newVal } : x))
    }
    setToggling(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw size={22} className="animate-spin" style={{ color: 'var(--tx3)' }} />
      </div>
    )
  }

  const sorted = [...subscribed, ...unsubscribed]

  return (
    <div className="space-y-5">

      {/* Summary */}
      <div className="flex flex-wrap items-center gap-4 rounded-2xl px-5 py-4"
        style={{ background: 'var(--s2)', border: '1px solid var(--bd)' }}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
            <Users size={18} className="text-white" />
          </div>
          <div>
            <p className="text-lg font-bold" style={{ color: 'var(--tx)' }}>
              {subscribed.length} מנויים מתוך {users.length} חברים
            </p>
            <p className="text-xs" style={{ color: 'var(--tx3)' }}>
              {unsubscribed.length} הסירו את עצמם מהרשימה
            </p>
          </div>
        </div>
        <div className="mr-auto flex gap-3">
          <span className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold"
            style={{ background: 'rgba(16,185,129,.1)', color: '#059669', border: '1px solid rgba(16,185,129,.2)' }}>
            <Mail size={12} /> {subscribed.length} מנויים
          </span>
          <span className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold"
            style={{ background: 'rgba(239,68,68,.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,.2)' }}>
            <MailX size={12} /> {unsubscribed.length} הסירו
          </span>
        </div>
      </div>

      {error && (
        <p className="rounded-xl px-4 py-3 text-sm font-semibold"
          style={{ background: 'rgba(239,68,68,.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,.2)' }}>
          {error}
        </p>
      )}

      {/* List */}
      <div className="overflow-hidden rounded-2xl" style={{ border: '1px solid var(--bd)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--s2)', borderBottom: '1px solid var(--bd)' }}>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--tx3)' }}>שם</th>
              <th className="hidden px-4 py-3 text-right text-xs font-bold uppercase tracking-wider sm:table-cell" style={{ color: 'var(--tx3)' }}>אימייל</th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--tx3)' }}>סטטוס</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--tx3)' }}>פעולה</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((u, i) => {
              const isUnsub = u.unsubscribed_emails
              const isToggling = toggling === u.id
              return (
                <tr key={u.id}
                  style={{
                    background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,.015)',
                    borderBottom: '1px solid var(--bd)',
                  }}>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--tx)' }}>
                    {dName(u)}
                    {u.username && u.full_name && (
                      <span className="mr-1.5 text-xs" style={{ color: 'var(--tx3)' }}>@{u.username}</span>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell" style={{ color: 'var(--tx2)' }}>
                    {u.email ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    {isUnsub ? (
                      <span className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold"
                        style={{ background: 'rgba(239,68,68,.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,.2)' }}>
                        <MailX size={11} /> הסיר עצמו
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold"
                        style={{ background: 'rgba(16,185,129,.08)', color: '#059669', border: '1px solid rgba(16,185,129,.2)' }}>
                        <Mail size={11} /> מנוי ✅
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleToggle(u)}
                      disabled={isToggling}
                      className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition hover:opacity-80 disabled:opacity-40"
                      style={isUnsub
                        ? { background: 'rgba(16,185,129,.1)', color: '#059669', border: '1px solid rgba(16,185,129,.25)' }
                        : { background: 'rgba(239,68,68,.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,.2)' }
                      }>
                      {isToggling
                        ? <RefreshCw size={11} className="animate-spin" />
                        : isUnsub ? <Mail size={11} /> : <MailX size={11} />
                      }
                      {isUnsub ? 'הוסף לרשימה' : 'הסר מרשימה'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {sorted.length === 0 && (
          <div className="py-12 text-center text-sm" style={{ color: 'var(--tx3)' }}>אין משתמשים פעילים</div>
        )}
      </div>
    </div>
  )
}

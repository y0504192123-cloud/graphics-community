'use client'

import { useState, useTransition } from 'react'
import { Flag, X } from 'lucide-react'
import { reportContent } from '@/app/actions/reports'

const REASONS = ['תוכן פוגעני', 'ספאם', 'הטרדה', 'תוכן לא הולם', 'אחר']

type ContentType = 'message' | 'private_message' | 'forum_reply' | 'forum_thread' | 'inspiration_post'

export default function ReportButton({
  contentType,
  contentId,
  buttonClassName = 'rounded p-1 transition hover:bg-red-500/10',
  buttonStyle,
  iconSize = 11,
}: {
  contentType: ContentType
  contentId: string
  buttonClassName?: string
  buttonStyle?: React.CSSProperties
  iconSize?: number
}) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleOpen(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    setOpen(true)
  }

  function handleClose() {
    setOpen(false)
    setSelected(null)
    setDone(false)
  }

  function handleSubmit() {
    if (!selected) return
    startTransition(async () => {
      const result = await reportContent(contentType, contentId, selected)
      if (!result?.error) {
        setDone(true)
        setTimeout(handleClose, 1800)
      }
    })
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className={buttonClassName}
        style={buttonStyle ?? { color: 'var(--tx3)' }}
        title="דווח על תוכן"
      >
        <Flag size={iconSize} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(6px)' }}
          onClick={e => { e.stopPropagation(); handleClose() }}
        >
          <div
            className="w-full max-w-sm overflow-hidden rounded-2xl"
            style={{ background: 'var(--s1)', border: '1px solid var(--bd)', boxShadow: '0 24px 60px rgba(0,0,0,.5)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--bd)' }}>
              <div className="flex items-center gap-2">
                <Flag size={15} style={{ color: '#ef4444' }} />
                <span className="font-bold" style={{ color: 'var(--tx)' }}>דיווח על תוכן</span>
              </div>
              <button onClick={handleClose} className="transition hover:opacity-70" style={{ color: 'var(--tx3)' }}>
                <X size={16} />
              </button>
            </div>

            {done ? (
              <div className="px-5 py-10 text-center">
                <p className="mb-3 text-4xl">✅</p>
                <p className="font-bold" style={{ color: 'var(--tx)' }}>הדיווח נשלח</p>
                <p className="mt-1 text-sm" style={{ color: 'var(--tx3)' }}>תודה. נבדוק בהקדם</p>
              </div>
            ) : (
              <div className="p-5">
                <p className="mb-3 text-sm" style={{ color: 'var(--tx2)' }}>בחר סיבה לדיווח:</p>
                <div className="space-y-2">
                  {REASONS.map(r => (
                    <button
                      key={r}
                      onClick={() => setSelected(r)}
                      className="w-full rounded-xl px-4 py-2.5 text-start text-sm font-medium transition"
                      style={{
                        background: selected === r ? 'rgba(239,68,68,.1)' : 'var(--inp)',
                        border: selected === r ? '1px solid rgba(239,68,68,.4)' : '1px solid var(--bd)',
                        color: selected === r ? '#ef4444' : 'var(--tx2)',
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={handleSubmit}
                    disabled={!selected || isPending}
                    className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)' }}
                  >
                    {isPending ? 'שולח...' : 'שלח דיווח'}
                  </button>
                  <button
                    onClick={handleClose}
                    className="rounded-xl px-4 py-2.5 text-sm font-medium transition hover:opacity-80"
                    style={{ background: 'var(--inp)', border: '1px solid var(--bd)', color: 'var(--tx2)' }}
                  >
                    ביטול
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

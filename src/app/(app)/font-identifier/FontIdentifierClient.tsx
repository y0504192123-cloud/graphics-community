'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Send, ImagePlus, X, ScanText } from 'lucide-react'
import type { FontConversationRow } from './page'

type Props = {
  identifyFont: (
    userText: string,
    imageBase64?: string,
    imageMimeType?: string,
  ) => Promise<{ response?: string; error?: string }>
  initialHistory: FontConversationRow[]
}

type Message = {
  id: string
  role: 'user' | 'ai'
  content: string
  imageUrl?: string
  isLoading?: boolean
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-0.5">
      {[0, 1, 2].map(i => (
        <span key={i} className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce"
          style={{ animationDelay: `${i * 150}ms` }} />
      ))}
    </div>
  )
}

// Split a line into segments: bold (**text**), URLs (https://...), or plain text
function renderLine(line: string): React.ReactNode[] {
  const segments = line.split(/(https?:\/\/[^\s)>\]"]+|\*\*[^*]+\*\*)/)
  return segments.map((seg, i) => {
    if (seg.startsWith('**') && seg.endsWith('**')) {
      return <strong key={i}>{seg.slice(2, -2)}</strong>
    }
    if (seg.startsWith('http')) {
      // Strip trailing punctuation that isn't part of the URL
      const url = seg.replace(/[.,;:!?)]+$/, '')
      const trailing = seg.slice(url.length)
      return (
        <span key={i}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 font-medium break-all"
            style={{ color: '#a78bfa' }}
          >
            {url}
          </a>
          {trailing}
        </span>
      )
    }
    return seg
  })
}

function renderAI(text: string) {
  return text.split('\n').map((line, li, arr) => (
    <span key={li}>
      {renderLine(line)}
      {li < arr.length - 1 && <br />}
    </span>
  ))
}

export default function FontIdentifierClient({ identifyFont, initialHistory }: Props) {
  const [messages, setMessages] = useState<Message[]>(() =>
    initialHistory.map(h => ({
      id: h.id,
      role: h.role === 'assistant' ? 'ai' : 'user',
      content: h.content,
      imageUrl: h.image_url ?? undefined,
    }))
  )
  const [inputText, setInputText]     = useState('')
  const [imageFile, setImageFile]     = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [isLoading, setIsLoading]     = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef   = useRef<HTMLInputElement>(null)
  const textRef   = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Image helpers ──────────────────────────────────────
  const loadImageFile = (file: File) => {
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string
      setImagePreview(dataUrl)
      setImageBase64(dataUrl.split(',')[1])
    }
    reader.readAsDataURL(file)
  }

  const clearImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setImageBase64(null)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) loadImageFile(file)
    if (fileRef.current) fileRef.current.value = ''
  }

  // ── Paste image with Ctrl+V ────────────────────────────
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const imageItem = Array.from(e.clipboardData.items).find(item =>
      item.type.startsWith('image/')
    )
    if (!imageItem) return
    e.preventDefault()
    const file = imageItem.getAsFile()
    if (file) loadImageFile(file)
  }

  // ── Send ───────────────────────────────────────────────
  const handleSend = async () => {
    if ((!inputText.trim() && !imageFile) || isLoading) return

    const userContent = inputText.trim() || 'זהה את הפונט בתמונה'
    const preview  = imagePreview
    const base64   = imageBase64
    const mimeType = imageFile?.type ?? 'image/jpeg'

    setMessages(prev => [...prev, {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userContent,
      imageUrl: preview ?? undefined,
    }])
    setInputText('')
    clearImage()
    if (textRef.current) textRef.current.style.height = 'auto'

    const loadingId = `ai-${Date.now()}`
    setMessages(prev => [...prev, { id: loadingId, role: 'ai', content: '', isLoading: true }])
    setIsLoading(true)

    try {
      const result = await identifyFont(
        userContent,
        base64 ?? undefined,
        base64 ? mimeType : undefined,
      )
      setMessages(prev => prev.map(m =>
        m.id === loadingId
          ? { id: m.id, role: 'ai', content: result.response ?? result.error ?? 'שגיאה לא ידועה' }
          : m
      ))
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === loadingId
          ? { id: m.id, role: 'ai', content: 'שגיאה בתקשורת עם השרת' }
          : m
      ))
    }
    setIsLoading(false)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const canSend = (!!inputText.trim() || !!imageFile) && !isLoading

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col lg:h-screen" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-5 py-3.5"
        style={{ background: 'var(--hdr)', borderBottom: '1px solid var(--bd)' }}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
          <ScanText size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold" style={{ color: 'var(--tx)' }}>זיהוי פונט</h1>
          <p className="text-[11px]" style={{ color: 'var(--tx3)' }}>
            העלה תמונה עם טקסט ואני אזהה את הפונט
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">

        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl"
              style={{ background: 'rgba(124,58,237,.08)', border: '2px solid rgba(124,58,237,.15)' }}>
              <ScanText size={36} className="text-purple-400" />
            </div>
            <div>
              <p className="text-base font-bold" style={{ color: 'var(--tx)' }}>מוכן לזהות פונטים</p>
              <p className="mt-1 text-sm" style={{ color: 'var(--tx3)' }}>
                העלה תמונה, הדבק עם Ctrl+V, או שאל שאלה
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs max-w-sm w-full">
              {[
                { icon: '📸', text: 'העלה תמונה עם טקסט' },
                { icon: '📋', text: 'הדבק תמונה Ctrl+V' },
                { icon: '🔗', text: 'קישורים להורדה חינמית' },
              ].map(item => (
                <div key={item.text} className="flex flex-col items-center gap-1.5 rounded-2xl p-3"
                  style={{ background: 'var(--s1)', border: '1px solid var(--bd)' }}>
                  <span className="text-xl">{item.icon}</span>
                  <span style={{ color: 'var(--tx3)' }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {messages.map(msg => (
            <div key={msg.id}
              className={`flex items-end gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>

              {msg.role === 'ai' && (
                <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
                  <ScanText size={14} className="text-white" />
                </div>
              )}

              <div className={`flex max-w-[78%] flex-col gap-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                {msg.imageUrl && (
                  <img src={msg.imageUrl} alt="תמונה שהועלתה"
                    className="max-h-52 max-w-full rounded-2xl object-cover"
                    style={{ border: '2px solid rgba(124,58,237,.2)' }} />
                )}
                {(msg.isLoading || msg.content) && (
                  <div className="rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
                    style={msg.role === 'user'
                      ? { background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: 'white' }
                      : { background: 'var(--s1)', border: '1px solid var(--bd)', color: 'var(--tx)' }
                    }>
                    {msg.isLoading
                      ? <TypingDots />
                      : <span className="whitespace-pre-wrap">
                          {msg.role === 'ai' ? renderAI(msg.content) : msg.content}
                        </span>
                    }
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="shrink-0 px-3 py-2.5"
        style={{ background: 'var(--hdr)', borderTop: '1px solid var(--bd)' }}>

        {imagePreview && (
          <div className="mb-2 flex items-center gap-2.5 rounded-xl px-3 py-2"
            style={{ background: 'var(--inp)', border: '1px solid var(--bd)' }}>
            <img src={imagePreview} alt="" className="h-10 w-10 rounded-lg shrink-0 object-cover" />
            <span className="flex-1 truncate text-xs" style={{ color: 'var(--tx2)' }}>
              {imageFile?.name ?? 'תמונה מהלוח'}
            </span>
            <button onClick={clearImage}
              className="shrink-0 rounded p-0.5 hover:bg-red-500/10"
              style={{ color: 'var(--tx3)' }}>
              <X size={14} />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2 rounded-2xl px-2 py-1.5"
          style={{ background: 'var(--inp)', border: '1px solid var(--bd)' }}>
          <button
            onClick={() => fileRef.current?.click()}
            className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition hover:bg-purple-500/10"
            style={{ color: 'var(--tx3)' }}
            title="העלה תמונה">
            <ImagePlus size={16} />
          </button>

          <textarea
            ref={textRef}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKey}
            onPaste={handlePaste}
            onInput={e => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = Math.min(el.scrollHeight, 140) + 'px'
            }}
            rows={1}
            placeholder={imagePreview ? 'שאל שאלה על הפונט...' : 'העלה תמונה, הדבק Ctrl+V, או שאל שאלה...'}
            className="flex-1 resize-none bg-transparent py-1.5 text-sm leading-relaxed outline-none placeholder:text-slate-400"
            style={{ color: 'var(--tx)', maxHeight: '140px', overflowY: 'auto' }}
          />

          <button
            onClick={handleSend}
            disabled={!canSend}
            className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all hover:scale-105 disabled:opacity-30"
            style={{ background: canSend ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : 'var(--inp)' }}>
            <Send size={15} className={canSend ? 'text-white' : 'text-slate-400'} />
          </button>
        </div>

        <p className="mt-1 text-center text-[10px]" style={{ color: 'var(--tx3)' }}>
          Enter לשליחה · Shift+Enter לשורה חדשה · Ctrl+V להדבקת תמונה
        </p>
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
    </div>
  )
}

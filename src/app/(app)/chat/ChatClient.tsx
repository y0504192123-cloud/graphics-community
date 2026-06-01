'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Send, ArrowRight, Plus, X, Hash, Clock, Smile, MessageSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Topic, Message, Profile } from '@/types'

type Props = {
  topics: Topic[]
  categories: string[]
  currentUserId: string
  currentProfile: Profile | null
  createTopic: (formData: FormData) => Promise<void>
  sendMessage: (topicId: string, content: string) => Promise<void>
}

const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  'כללי':               { bg: 'rgba(124,58,237,.15)',  text: '#c084fc', border: 'rgba(124,58,237,.3)'  },
  'עזרה בפוטושופ':      { bg: 'rgba(59,130,246,.15)',  text: '#60a5fa', border: 'rgba(59,130,246,.3)'  },
  'עזרה באילוסטרייטור': { bg: 'rgba(234,179,8,.15)',   text: '#fbbf24', border: 'rgba(234,179,8,.3)'   },
  'עזרה ב-InDesign':    { bg: 'rgba(236,72,153,.15)',  text: '#f472b6', border: 'rgba(236,72,153,.3)'  },
  'השראה':              { bg: 'rgba(52,211,153,.15)',  text: '#34d399', border: 'rgba(52,211,153,.3)'  },
  'שיתוף עבודות':       { bg: 'rgba(245,158,11,.15)',  text: '#fbbf24', border: 'rgba(245,158,11,.3)'  },
  'כלים וטכניקות':      { bg: 'rgba(99,102,241,.15)',  text: '#818cf8', border: 'rgba(99,102,241,.3)'  },
}

const avatarGradients = [
  'from-violet-600 to-purple-800',
  'from-pink-600 to-rose-800',
  'from-blue-600 to-indigo-800',
  'from-emerald-600 to-teal-800',
  'from-amber-600 to-orange-800',
]

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function CategoryBadge({ cat }: { cat: string }) {
  const c = categoryColors[cat] ?? categoryColors['כללי']
  return (
    <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
      {cat}
    </span>
  )
}

const inputCls = 'w-full rounded-xl border bg-white/[0.04] px-4 py-2.5 text-sm text-slate-100 outline-none transition-all placeholder:text-slate-600 focus:bg-white/[0.06] focus:ring-2 focus:ring-purple-500/20'

export default function ChatClient({ topics: initialTopics, categories, currentUserId, currentProfile, createTopic, sendMessage }: Props) {
  const [topics, setTopics]               = useState<Topic[]>(initialTopics)
  const [view, setView]                   = useState<'list' | 'chat'>('list')
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null)
  const [messages, setMessages]           = useState<Message[]>([])
  const [text, setText]                   = useState('')
  const [isSending, setIsSending]         = useState(false)
  const [showCreate, setShowCreate]       = useState(false)
  const [filterCat, setFilterCat]         = useState('הכל')
  const bottomRef  = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const supabase = useMemo(() => createClient(), [])

  // Realtime: new topics
  useEffect(() => {
    const ch = supabase
      .channel('topics-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'topics' }, async (payload) => {
        const newTopic = payload.new as Topic
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', newTopic.created_by).single()
        setTopics((prev) => [{ ...newTopic, profiles: profile ?? undefined }, ...prev])
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [supabase])

  // Realtime: messages in selected topic
  useEffect(() => {
    if (!selectedTopic) return
    const ch = supabase
      .channel(`room:${selectedTopic.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${selectedTopic.id}` },
        async (payload) => {
          const newMsg = payload.new as Message
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', newMsg.user_id).single()
          setMessages((prev) => {
            const withoutTemp = prev.filter(
              (m) => !(m.id.startsWith('temp-') && m.user_id === newMsg.user_id && m.content === newMsg.content)
            )
            if (withoutTemp.some((m) => m.id === newMsg.id)) return withoutTemp
            return [...withoutTemp, { ...newMsg, profiles: profile ?? undefined }]
          })
        })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [selectedTopic?.id, supabase])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const openTopic = async (topic: Topic) => {
    setSelectedTopic(topic)
    setView('chat')
    const { data } = await supabase
      .from('messages').select('*, profiles(*)')
      .eq('channel_id', topic.id)
      .order('created_at', { ascending: true })
      .limit(50)
    setMessages((data as Message[]) ?? [])
  }

  const handleSend = async () => {
    if (!text.trim() || !selectedTopic || isSending) return
    const content = text.trim()
    setText('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    const tempMsg: Message = {
      id: `temp-${Date.now()}`,
      channel_id: selectedTopic.id,
      user_id: currentUserId,
      content,
      created_at: new Date().toISOString(),
      profiles: currentProfile ?? undefined,
    }
    setMessages((prev) => [...prev, tempMsg])

    setIsSending(true)
    try { await sendMessage(selectedTopic.id, content) }
    finally { setIsSending(false) }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  const displayName = (p: Profile | null | undefined) => p?.full_name ?? p?.username ?? 'משתמש'
  const initials    = (name: string) => name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  const avatarGrad  = (uid: string)  => avatarGradients[hashStr(uid) % avatarGradients.length]

  const filteredTopics = filterCat === 'הכל' ? topics : topics.filter((t) => t.category === filterCat)

  /* ── Topics list view ── */
  if (view === 'list') {
    return (
      <div className="min-h-full" style={{ background: 'var(--bg)' }}>

        {/* Header */}
        <div
          className="relative overflow-hidden px-6 py-8"
          style={{ background: 'linear-gradient(135deg, #0a0a18 0%, var(--bg) 70%)' }}
        >
          <div className="pointer-events-none absolute -top-16 start-0 h-48 w-48 rounded-full opacity-25" style={{ background: 'radial-gradient(circle, rgba(52,211,153,.5) 0%, transparent 70%)', filter: 'blur(40px)' }} />
          <div className="grid-pattern absolute inset-0" />
          <div className="relative mx-auto max-w-5xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white lg:text-3xl">צ׳אטים</h1>
                <p className="mt-1 text-sm text-slate-400">שוחח עם הקהילה לפי נושאים</p>
              </div>
              <button
                onClick={() => setShowCreate((s) => !s)}
                className="flex w-fit items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 4px 20px rgba(124,58,237,.4)' }}
              >
                {showCreate ? <X size={15} /> : <Plus size={15} />}
                {showCreate ? 'ביטול' : 'נושא חדש'}
              </button>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-6 py-6">
          {/* Create topic form */}
          {showCreate && (
            <form
              action={(fd) => { createTopic(fd); setShowCreate(false) }}
              className="mb-6 animate-fade-up rounded-2xl p-5"
              style={{ background: 'rgba(124,58,237,.06)', border: '1px solid rgba(124,58,237,.2)' }}
            >
              <h3 className="mb-4 text-sm font-bold text-purple-300">פתח נושא חדש לשיחה</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <input name="title" required placeholder="כותרת הנושא — לדוגמה: עזרה בעיצוב לוגו" className={inputCls} style={{ borderColor: 'rgba(124,58,237,.3)' }} />
                </div>
                <div>
                  <select name="category" className={inputCls} style={{ borderColor: 'rgba(124,58,237,.3)' }}>
                    {(categories.length ? categories : ['כללי']).map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" className="mt-4 rounded-xl px-5 py-2 text-sm font-bold text-white transition hover:opacity-90" style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
                פתח נושא
              </button>
            </form>
          )}

          {/* Category filters */}
          <div className="mb-5 flex flex-wrap gap-2">
            {['הכל', ...(categories.length ? categories : ['כללי'])].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCat(cat)}
                className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200"
                style={filterCat === cat
                  ? { background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: 'white', boxShadow: '0 2px 12px rgba(124,58,237,.4)' }
                  : { background: 'var(--inp)', border: '1px solid var(--bd)', color: '#94a3b8' }
                }
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Topics grid */}
          {filteredTopics.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-2xl py-20 text-center" style={{ border: '2px dashed var(--bd)', background: 'var(--inp)' }}>
              <MessageSquare size={32} className="text-slate-600" />
              <div>
                <p className="font-semibold text-slate-400">אין נושאים עדיין</p>
                <p className="mt-1 text-sm text-slate-600">היה הראשון לפתוח שיחה!</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTopics.map((topic, i) => {
                const c = categoryColors[topic.category] ?? categoryColors['כללי']
                const creator = displayName(topic.profiles)
                return (
                  <button
                    key={topic.id}
                    onClick={() => openTopic(topic)}
                    className="group animate-fade-up overflow-hidden rounded-2xl text-start transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5"
                    style={{
                      background: 'var(--s2)',
                      border: '1px solid var(--bd)',
                      boxShadow: '0 2px 12px rgba(0,0,0,.2)',
                      animationDelay: `${i * 40}ms`,
                    }}
                  >
                    {/* Color stripe */}
                    <div className="h-1 w-full" style={{ background: c.text }} />
                    <div className="p-4">
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <CategoryBadge cat={topic.category} />
                        <span className="flex items-center gap-1 text-xs text-slate-600">
                          <Clock size={10} />
                          {new Date(topic.created_at).toLocaleDateString('he-IL')}
                        </span>
                      </div>
                      <h3 className="mb-3 font-bold text-slate-100 transition-colors group-hover:text-white line-clamp-2">
                        {topic.title}
                      </h3>
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${avatarGrad(topic.created_by)} text-[9px] font-bold text-white`}
                        >
                          {initials(creator)}
                        </div>
                        <span className="text-xs text-slate-500">{creator}</span>
                      </div>
                    </div>
                    <div
                      className="flex items-center justify-end gap-1 px-4 py-2 text-xs text-slate-500 transition-colors group-hover:text-purple-400"
                      style={{ borderTop: '1px solid var(--bd)' }}
                    >
                      <span>הצטרף לשיחה</span>
                      <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  /* ── Chat conversation view ── */
  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden lg:h-screen" style={{ background: 'var(--bg)' }}>

      {/* Topic header */}
      <div
        className="shrink-0 flex items-center gap-3 px-5 py-3.5"
        style={{ background: 'var(--hdr)', borderBottom: '1px solid var(--bd)', backdropFilter: 'blur(20px)' }}
      >
        <button
          onClick={() => { setView('list'); setSelectedTopic(null); setMessages([]) }}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white/[0.07] hover:text-slate-200"
        >
          <ArrowRight size={17} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Hash size={14} className="shrink-0 text-purple-400" />
            <h2 className="truncate text-sm font-bold text-white">{selectedTopic?.title}</h2>
          </div>
          {selectedTopic && <CategoryBadge cat={selectedTopic.category} />}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-emerald-400 shrink-0">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          פעיל
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 lg:px-6">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: 'rgba(124,58,237,.1)', border: '1px solid rgba(124,58,237,.2)' }}>
              <MessageSquare size={26} className="text-purple-400" />
            </div>
            <div>
              <p className="font-bold text-slate-200">{selectedTopic?.title}</p>
              <p className="mt-1 text-sm text-slate-600">היה הראשון לכתוב הודעה בנושא זה</p>
            </div>
          </div>
        )}

        <div className="space-y-1">
          {messages.map((msg, i) => {
            const isOwn = msg.user_id === currentUserId
            const prevMsg = messages[i - 1]
            const sameUser = prevMsg?.user_id === msg.user_id
            const isTemp = msg.id.startsWith('temp-')
            const name = displayName(msg.profiles)
            const gradient = avatarGrad(msg.user_id)

            return (
              <div key={msg.id} className={`group flex items-end gap-2.5 ${isOwn ? 'flex-row-reverse' : ''} ${sameUser ? 'mt-0.5' : 'mt-4'}`}>
                {!sameUser ? (
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-xs font-bold text-white shadow-md`}>
                    {initials(name)}
                  </div>
                ) : (
                  <div className="w-8 shrink-0" />
                )}

                <div className={`flex max-w-[72%] flex-col gap-0.5 ${isOwn ? 'items-end' : 'items-start'}`}>
                  {!sameUser && (
                    <div className={`flex items-center gap-2 px-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
                      <span className="text-xs font-semibold text-slate-300">{isOwn ? 'אתה' : name}</span>
                      <span className="text-[10px] text-slate-600">
                        {new Date(msg.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                  <div
                    className={`relative rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${isTemp ? 'opacity-70' : 'opacity-100'}`}
                    style={isOwn
                      ? { background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 2px 12px rgba(124,58,237,.25)', color: 'white' }
                      : { background: 'var(--s2)', border: '1px solid var(--bd)', color: 'var(--tx2)' }
                    }
                  >
                    {msg.content}
                    {isTemp && <span className="absolute -bottom-4 end-0 text-[9px] text-slate-600">שולח...</span>}
                  </div>
                  {sameUser && (
                    <span className="px-1 text-[10px] text-slate-700 opacity-0 transition-opacity group-hover:opacity-100">
                      {new Date(msg.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 px-4 py-3 lg:px-5" style={{ background: 'var(--hdr)', borderTop: '1px solid var(--bd)' }}>
        <div className="flex items-end gap-2 rounded-2xl p-2" style={{ background: 'var(--inp)', border: '1px solid var(--bd)' }}>
          <button className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-600 transition hover:bg-white/[0.07] hover:text-slate-400">
            <Smile size={17} />
          </button>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={`הודעה בנושא: ${selectedTopic?.title ?? ''}...`}
            className="flex-1 resize-none bg-transparent py-1.5 text-sm outline-none placeholder:text-slate-600"
            style={{ color: 'var(--tx)', maxHeight: '120px' }}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || isSending}
            className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-md transition-all duration-200 hover:scale-105 disabled:opacity-30"
            style={{ background: text.trim() ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : 'var(--inp)' }}
          >
            <Send size={15} className={text.trim() ? '' : 'text-slate-600'} />
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-slate-700">Enter לשליחה · Shift+Enter לשורה חדשה</p>
      </div>
    </div>
  )
}

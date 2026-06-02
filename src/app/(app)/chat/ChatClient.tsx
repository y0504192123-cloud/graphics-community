'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Send, ArrowRight, Plus, X, Hash, Clock, Smile, MessageSquare, Lock, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Topic, Message, Profile, PrivateMessage } from '@/types'

type Props = {
  topics: Topic[]
  categories: string[]
  currentUserId: string
  currentProfile: Profile | null
  isAdmin: boolean
  createTopic: (formData: FormData) => Promise<void>
  sendMessage: (topicId: string, content: string) => Promise<void>
  deleteMessage: (messageId: string) => Promise<void>
  initialPrivateMessages: PrivateMessage[]
  sendPrivateMessage: (receiverId: string, content: string) => Promise<void>
  deletePrivateMessage: (messageId: string) => Promise<void>
  markMessagesRead: (senderId: string) => Promise<void>
  initialDmUserId: string | null
  initialDmProfile: Profile | null
  initialJobQuote: string | null
}

type Convo = {
  partnerId: string
  profile: Profile | null
  msgs: PrivateMessage[]
  lastMsg: PrivateMessage
  unread: number
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

type InputBarProps = {
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onSend: () => void
  isSending: boolean
  textRef: React.RefObject<HTMLTextAreaElement | null>
}

function InputBar({ value, onChange, onKeyDown, onSend, isSending, textRef }: InputBarProps) {
  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }
  return (
    <div className="shrink-0 px-4 py-3 lg:px-5" style={{ background: 'var(--hdr)', borderTop: '1px solid var(--bd)' }}>
      <div className="flex items-end gap-2 rounded-2xl p-2" style={{ background: 'var(--inp)', border: '1px solid var(--bd)' }}>
        <button className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-600 transition hover:bg-white/[0.07] hover:text-slate-400">
          <Smile size={17} />
        </button>
        <textarea
          ref={textRef}
          value={value}
          onChange={onChange}
          onInput={handleInput}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder="כתוב הודעה..."
          className="flex-1 resize-none bg-transparent py-1.5 text-sm leading-relaxed outline-none placeholder:text-slate-600"
          style={{ color: 'var(--tx)', maxHeight: '210px', overflowY: 'auto' }}
        />
        <button
          onClick={onSend}
          disabled={!value.trim() || isSending}
          className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-md transition-all duration-200 hover:scale-105 disabled:opacity-30"
          style={{ background: value.trim() ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : 'var(--inp)' }}
        >
          <Send size={15} className={value.trim() ? '' : 'text-slate-600'} />
        </button>
      </div>
      <p className="mt-1.5 text-center text-[10px] text-slate-700">Enter לשליחה · Shift+Enter לשורה חדשה</p>
    </div>
  )
}

const headerBg: React.CSSProperties = { background: 'linear-gradient(135deg, #0a0a18 0%, var(--bg) 70%)' }

function BgDecorations() {
  return (
    <>
      <div className="pointer-events-none absolute -top-16 start-0 h-48 w-48 rounded-full opacity-25" style={{ background: 'radial-gradient(circle, rgba(52,211,153,.5) 0%, transparent 70%)', filter: 'blur(40px)' }} />
      <div className="grid-pattern absolute inset-0" />
    </>
  )
}

export default function ChatClient({
  topics: initialTopics, categories,
  currentUserId, currentProfile, isAdmin,
  createTopic, sendMessage, deleteMessage,
  initialPrivateMessages,
  sendPrivateMessage, deletePrivateMessage, markMessagesRead,
  initialDmUserId, initialDmProfile, initialJobQuote,
}: Props) {

  const [mainTab, setMainTab] = useState<'community' | 'private'>(initialDmUserId ? 'private' : 'community')

  // Community state
  const [topics, setTopics]             = useState<Topic[]>(initialTopics)
  const [communityView, setCommunityView] = useState<'list' | 'chat'>('list')
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null)
  const [communityMsgs, setCommunityMsgs] = useState<Message[]>([])
  const [communityText, setCommunityText] = useState('')
  const [isSendingC, setIsSendingC]     = useState(false)
  const [sendError, setSendError]       = useState<string | null>(null)
  const [showCreate, setShowCreate]     = useState(false)
  const [filterCat, setFilterCat]       = useState('הכל')

  // Private state
  const [privateMsgs, setPrivateMsgs]   = useState<PrivateMessage[]>(initialPrivateMessages)
  const [selectedPartner, setSelectedPartner] = useState<string | null>(initialDmUserId)
  const [dmView, setDmView]             = useState<'list' | 'chat'>(initialDmUserId ? 'chat' : 'list')
  const [privateText, setPrivateText]   = useState(initialJobQuote ?? '')
  const [isSendingP, setIsSendingP]     = useState(false)

  const communityBottomRef = useRef<HTMLDivElement>(null)
  const privateBottomRef   = useRef<HTMLDivElement>(null)
  const communityTextRef   = useRef<HTMLTextAreaElement>(null)
  const privateTextRef     = useRef<HTMLTextAreaElement>(null)
  const selectedPartnerRef = useRef<string | null>(selectedPartner)
  selectedPartnerRef.current = selectedPartner
  const markReadRef = useRef(markMessagesRead)
  markReadRef.current = markMessagesRead

  const supabase = useMemo(() => createClient(), [])

  // ── Computed ──

  const convos: Convo[] = useMemo(() => {
    const map = new Map<string, { msgs: PrivateMessage[], profile: Profile | null }>()

    for (const msg of privateMsgs) {
      const partnerId = msg.sender_id === currentUserId ? msg.receiver_id : msg.sender_id
      const profile = msg.sender_id === currentUserId
        ? (msg.receiver as Profile | undefined ?? null)
        : (msg.sender as Profile | undefined ?? null)
      if (!map.has(partnerId)) map.set(partnerId, { msgs: [], profile: null })
      const entry = map.get(partnerId)!
      entry.msgs.push(msg)
      if (!entry.profile && profile) entry.profile = profile
    }

    return Array.from(map.entries())
      .map(([partnerId, { msgs, profile }]) => ({
        partnerId, profile, msgs,
        lastMsg: msgs[msgs.length - 1],
        unread: msgs.filter(m => m.receiver_id === currentUserId && !m.is_read).length,
      }))
      .filter(c => c.lastMsg !== undefined)
      .sort((a, b) => new Date(b.lastMsg.created_at).getTime() - new Date(a.lastMsg.created_at).getTime())
  }, [privateMsgs, currentUserId])

  const totalUnread = useMemo(() =>
    privateMsgs.filter(m => m.receiver_id === currentUserId && !m.is_read).length,
    [privateMsgs, currentUserId]
  )

  const currentConvMsgs = useMemo(() => {
    if (!selectedPartner) return []
    return privateMsgs.filter(m =>
      (m.sender_id === currentUserId && m.receiver_id === selectedPartner) ||
      (m.sender_id === selectedPartner && m.receiver_id === currentUserId)
    )
  }, [privateMsgs, selectedPartner, currentUserId])

  const partnerProfile = useMemo(() => {
    if (!selectedPartner) return null
    if (selectedPartner === initialDmUserId && initialDmProfile) return initialDmProfile
    return convos.find(c => c.partnerId === selectedPartner)?.profile ?? null
  }, [selectedPartner, convos, initialDmUserId, initialDmProfile])

  // ── Realtime ──

  // New topics (community list)
  useEffect(() => {
    const ch = supabase.channel('rt-topics')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'topics' }, async (payload) => {
        const newTopic = payload.new as Topic
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', newTopic.created_by).single()
        setTopics(prev => [{ ...newTopic, profiles: profile ?? undefined }, ...prev])
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [supabase])

  // Community chat messages — filter by channel_id (works now that REPLICA IDENTITY FULL is set)
  useEffect(() => {
    if (!selectedTopic) return
    const topicId = selectedTopic.id
    const ch = supabase.channel(`rt-messages-${topicId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${topicId}` }, async (payload) => {
        const newMsg = payload.new as Message
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', newMsg.user_id).single()
        setCommunityMsgs(prev => {
          const withoutTemp = prev.filter(
            m => !(m.id.startsWith('temp-') && m.user_id === newMsg.user_id && m.content === newMsg.content)
          )
          if (withoutTemp.some(m => m.id === newMsg.id)) return withoutTemp
          return [...withoutTemp, { ...newMsg, profiles: profile ?? undefined }]
        })
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages', filter: `channel_id=eq.${topicId}` }, (payload) => {
        const old = payload.old as { id: string }
        setCommunityMsgs(prev => prev.filter(m => m.id !== old.id))
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [selectedTopic?.id, supabase])

  // Private messages
  useEffect(() => {
    const ch = supabase.channel('rt-private-messages')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'private_messages' }, (payload) => {
        const updated = payload.new as { id: string; is_read: boolean }
        setPrivateMsgs(prev => prev.map(m => m.id === updated.id ? { ...m, is_read: updated.is_read } : m))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'private_messages' }, (payload) => {
        const old = payload.old as { id: string }
        setPrivateMsgs(prev => prev.filter(m => m.id !== old.id))
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'private_messages' }, async (payload) => {
        const newMsg = payload.new as PrivateMessage
        // Only care about messages involving the current user
        if (newMsg.sender_id !== currentUserId && newMsg.receiver_id !== currentUserId) return

        const [{ data: senderProfile }, { data: receiverProfile }] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', newMsg.sender_id).single(),
          supabase.from('profiles').select('*').eq('id', newMsg.receiver_id).single(),
        ])
        const fullMsg: PrivateMessage = { ...newMsg, sender: senderProfile ?? undefined, receiver: receiverProfile ?? undefined }

        setPrivateMsgs(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev
          // Replace matching temp message (own sent messages)
          if (newMsg.sender_id === currentUserId) {
            const withoutTemp = prev.filter(
              m => !(m.id.startsWith('temp-') && m.sender_id === currentUserId && m.receiver_id === newMsg.receiver_id && m.content === newMsg.content)
            )
            return [...withoutTemp, fullMsg]
          }
          return [...prev, fullMsg]
        })

        // Auto-mark as read if conversation with this sender is currently open
        if (newMsg.receiver_id === currentUserId && selectedPartnerRef.current === newMsg.sender_id) {
          markReadRef.current(newMsg.sender_id)
          setPrivateMsgs(prev => prev.map(m =>
            m.sender_id === newMsg.sender_id && m.receiver_id === currentUserId && !m.is_read
              ? { ...m, is_read: true }
              : m
          ))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [supabase, currentUserId])

  useEffect(() => { communityBottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [communityMsgs])
  useEffect(() => { privateBottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [currentConvMsgs])

  // ── Handlers ──

  const openConversation = async (partnerId: string) => {
    setSelectedPartner(partnerId)
    setDmView('chat')
    setPrivateMsgs(prev => prev.map(m =>
      m.sender_id === partnerId && m.receiver_id === currentUserId && !m.is_read
        ? { ...m, is_read: true }
        : m
    ))
    await markMessagesRead(partnerId)
  }

  const openTopic = async (topic: Topic) => {
    setSelectedTopic(topic)
    setCommunityView('chat')
    const { data } = await supabase.from('messages').select('*, profiles(*)').eq('channel_id', topic.id).order('created_at', { ascending: true }).limit(50)
    setCommunityMsgs((data as Message[]) ?? [])
  }

  const handleCommunitySend = async () => {
    console.log('[CLIENT handleCommunitySend] called — text:', communityText, 'topic:', selectedTopic?.id, 'isSending:', isSendingC)
    if (!communityText.trim() || !selectedTopic || isSendingC) {
      console.log('[CLIENT handleCommunitySend] BLOCKED — text empty?', !communityText.trim(), 'no topic?', !selectedTopic, 'already sending?', isSendingC)
      return
    }
    const content = communityText.trim()
    setCommunityText('')
    if (communityTextRef.current) { communityTextRef.current.style.height = 'auto' }
    setCommunityMsgs(prev => [...prev, {
      id: `temp-${Date.now()}`,
      channel_id: selectedTopic.id,
      user_id: currentUserId,
      content,
      created_at: new Date().toISOString(),
      profiles: currentProfile ?? undefined,
    }])
    console.log('[CLIENT handleCommunitySend] calling sendMessage...')
    setSendError(null)
    setIsSendingC(true)
    try {
      await sendMessage(selectedTopic.id, content)
      console.log('[CLIENT handleCommunitySend] sendMessage returned OK')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[sendMessage] client error:', err)
      setSendError(msg)
    } finally {
      setIsSendingC(false)
    }
  }

  const handlePrivateSend = async () => {
    if (!privateText.trim() || !selectedPartner || isSendingP) return
    const content = privateText.trim()
    setPrivateText('')
    if (privateTextRef.current) { privateTextRef.current.style.height = 'auto' }
    setPrivateMsgs(prev => [...prev, {
      id: `temp-${Date.now()}`,
      sender_id: currentUserId,
      receiver_id: selectedPartner,
      content,
      job_id: null,
      is_read: false,
      created_at: new Date().toISOString(),
      sender: currentProfile ?? undefined,
    }])
    setIsSendingP(true)
    try { await sendPrivateMessage(selectedPartner, content) } finally { setIsSendingP(false) }
  }

  const handleDeleteCommunityMsg = (messageId: string) => {
    setCommunityMsgs(prev => prev.filter(m => m.id !== messageId))
    deleteMessage(messageId)
  }

  const handleDeletePrivateMsg = (messageId: string) => {
    setPrivateMsgs(prev => prev.filter(m => m.id !== messageId))
    deletePrivateMessage(messageId)
  }

  const handleCommunityKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCommunitySend() } }
  const handlePrivateKey   = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePrivateSend() } }

  const makeTextareaHandler = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setter(e.target.value)
  }

  const dName      = (p: Profile | null | undefined) => p?.full_name ?? p?.username ?? 'משתמש'
  const initials   = (name: string) => name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  const avatarGrad = (uid: string) => avatarGradients[hashStr(uid) % avatarGradients.length]
  const filteredTopics = filterCat === 'הכל' ? topics : topics.filter(t => t.category === filterCat)

  // Shared tab bar
  const TabBar = (
    <div className="mt-4 flex gap-1">
      {([
        { id: 'community' as const, label: 'קהילתי', icon: <MessageSquare size={14} />, badge: 0 },
        { id: 'private'   as const, label: 'פרטי',   icon: <Lock size={14} />,          badge: totalUnread },
      ] as const).map(tab => (
        <button
          key={tab.id}
          onClick={() => setMainTab(tab.id)}
          className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200"
          style={mainTab === tab.id
            ? { background: 'rgba(255,255,255,.15)', color: 'white' }
            : { background: 'rgba(0,0,0,.25)', color: 'rgba(255,255,255,.55)', border: '1px solid rgba(255,255,255,.08)' }
          }
        >
          {tab.icon}
          <span>{tab.label}</span>
          {tab.badge > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
              {tab.badge > 9 ? '9+' : tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  )

  // ── COMMUNITY LIST ──
  if (mainTab === 'community' && communityView === 'list') {
    return (
      <div className="min-h-full" style={{ background: 'var(--bg)' }}>
        <div className="relative overflow-hidden px-6 py-8" style={headerBg}>
          <BgDecorations />
          <div className="relative mx-auto max-w-5xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white lg:text-3xl">צ׳אטים</h1>
                <p className="mt-1 text-sm text-slate-400">שוחח עם הקהילה לפי נושאים</p>
              </div>
              <button
                onClick={() => setShowCreate(s => !s)}
                className="flex w-fit items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 4px 20px rgba(124,58,237,.4)' }}
              >
                {showCreate ? <X size={15} /> : <Plus size={15} />}
                {showCreate ? 'ביטול' : 'נושא חדש'}
              </button>
            </div>
            {TabBar}
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-6 py-6">
          {showCreate && (
            <form
              action={(fd) => { createTopic(fd); setShowCreate(false) }}
              className="mb-6 animate-fade-up rounded-2xl p-5"
              style={{ background: 'rgba(124,58,237,.06)', border: '1px solid rgba(124,58,237,.2)' }}
            >
              <h3 className="mb-4 text-sm font-bold text-purple-300">פתח נושא חדש לשיחה</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-500">כותרת הנושא</label>
                  <input name="title" required className={inputCls} style={{ borderColor: 'rgba(124,58,237,.3)' }} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-500">קטגוריה</label>
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
                const creator = dName(topic.profiles)
                return (
                  <button
                    key={topic.id}
                    onClick={() => openTopic(topic)}
                    className="group animate-fade-up overflow-hidden rounded-2xl text-start transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5"
                    style={{ background: 'var(--s2)', border: '1px solid var(--bd)', boxShadow: '0 2px 12px rgba(0,0,0,.2)', animationDelay: `${i * 40}ms` }}
                  >
                    <div className="h-1 w-full" style={{ background: c.text }} />
                    <div className="p-4">
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <CategoryBadge cat={topic.category} />
                        <span className="flex items-center gap-1 text-xs text-slate-600">
                          <Clock size={10} />
                          {new Date(topic.created_at).toLocaleDateString('he-IL')}
                        </span>
                      </div>
                      <h3 className="mb-3 font-bold text-slate-100 transition-colors group-hover:text-white line-clamp-2">{topic.title}</h3>
                      <div className="flex items-center gap-2">
                        <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${avatarGrad(topic.created_by)} text-[9px] font-bold text-white`}>
                          {initials(creator)}
                        </div>
                        <span className="text-xs text-slate-500">{creator}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-1 px-4 py-2 text-xs text-slate-500 transition-colors group-hover:text-purple-400" style={{ borderTop: '1px solid var(--bd)' }}>
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

  // ── COMMUNITY CHAT ──
  if (mainTab === 'community' && communityView === 'chat') {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden lg:h-screen" style={{ background: 'var(--bg)' }}>
        <div className="shrink-0 flex items-center gap-3 px-5 py-3.5" style={{ background: 'var(--hdr)', borderBottom: '1px solid var(--bd)', backdropFilter: 'blur(20px)' }}>
          <button
            onClick={() => { setCommunityView('list'); setSelectedTopic(null); setCommunityMsgs([]) }}
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

        <div className="flex-1 overflow-y-auto px-4 py-4 lg:px-6">
          {communityMsgs.length === 0 && (
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
            {communityMsgs.map((msg, i) => {
              const isOwn = msg.user_id === currentUserId
              const prevMsg = communityMsgs[i - 1]
              const sameUser = prevMsg?.user_id === msg.user_id
              const isTemp = msg.id.startsWith('temp-')
              const name = dName(msg.profiles)
              const gradient = avatarGrad(msg.user_id)
              return (
                <div key={msg.id} className={`group flex items-end gap-2.5 ${isOwn ? 'flex-row-reverse' : ''} ${sameUser ? 'mt-0.5' : 'mt-4'}`}>
                  {!sameUser ? (
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-xs font-bold text-white shadow-md`}>
                      {initials(name)}
                    </div>
                  ) : <div className="w-8 shrink-0" />}
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
                      className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${isTemp ? 'opacity-60' : ''}`}
                      style={isOwn
                        ? { background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 2px 12px rgba(124,58,237,.25)', color: 'white' }
                        : { background: 'var(--s2)', border: '1px solid var(--bd)', color: 'var(--tx2)' }
                      }
                    >
                      {msg.content}
                    </div>
                    {(isOwn || isAdmin) && !isTemp && (
                      <button
                        onClick={() => handleDeleteCommunityMsg(msg.id)}
                        className="mt-0.5 flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] text-slate-700 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400"
                      >
                        <Trash2 size={10} />
                        מחק
                      </button>
                    )}
                    {isOwn && !isTemp && (
                      <span className="px-1 text-[10px] text-slate-600">✓</span>
                    )}
                    {sameUser && !(isOwn || isAdmin) && (
                      <span className="px-1 text-[10px] text-slate-700 opacity-0 transition-opacity group-hover:opacity-100">
                        {new Date(msg.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <div ref={communityBottomRef} />
        </div>

        {sendError && (
          <div className="shrink-0 px-4 py-2 text-xs text-red-400 bg-red-500/10 border-t border-red-500/20">
            שגיאה: {sendError}
          </div>
        )}
        <InputBar
          value={communityText}
          onChange={makeTextareaHandler(setCommunityText)}
          onKeyDown={handleCommunityKey}
          onSend={handleCommunitySend}
          isSending={isSendingC}
          textRef={communityTextRef}
        />
      </div>
    )
  }

  // ── PRIVATE LIST ──
  if (mainTab === 'private' && dmView === 'list') {
    return (
      <div className="min-h-full" style={{ background: 'var(--bg)' }}>
        <div className="relative overflow-hidden px-6 py-8" style={headerBg}>
          <BgDecorations />
          <div className="relative mx-auto max-w-5xl">
            <div>
              <h1 className="text-2xl font-bold text-white lg:text-3xl">צ׳אטים</h1>
              <p className="mt-1 text-sm text-slate-400">שיחות פרטיות</p>
            </div>
            {TabBar}
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-6 py-6">
          {convos.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-2xl py-20 text-center" style={{ border: '2px dashed var(--bd)', background: 'var(--inp)' }}>
              <Lock size={32} className="text-slate-600" />
              <div>
                <p className="font-semibold text-slate-400">אין שיחות פרטיות</p>
                <p className="mt-1 text-sm text-slate-600">לחץ &apos;פנה למפרסם&apos; בלוח העבודות כדי להתחיל שיחה</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {convos.map(convo => {
                const name = dName(convo.profile)
                const hasUnread = convo.unread > 0
                return (
                  <button
                    key={convo.partnerId}
                    onClick={() => openConversation(convo.partnerId)}
                    className="group flex w-full items-center gap-4 rounded-2xl p-4 text-start transition-all duration-200 hover:-translate-y-0.5"
                    style={{
                      background: 'var(--s2)',
                      border: hasUnread ? '1px solid rgba(124,58,237,.3)' : '1px solid var(--bd)',
                      boxShadow: '0 2px 12px rgba(0,0,0,.14)',
                    }}
                  >
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${avatarGrad(convo.partnerId)} text-sm font-bold text-white shadow-md`}>
                      {convo.profile?.avatar_url
                        ? <img src={convo.profile.avatar_url} alt={name} className="h-12 w-12 rounded-full object-cover" />
                        : initials(name)
                      }
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-semibold ${hasUnread ? 'text-white' : 'text-slate-200'}`}>{name}</span>
                        <span className="text-[11px] text-slate-500">
                          {new Date(convo.lastMsg.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center justify-between gap-2">
                        <p className={`truncate text-xs ${hasUnread ? 'text-slate-300' : 'text-slate-500'}`}>
                          {convo.lastMsg.sender_id === currentUserId && <span className="text-slate-600">אתה: </span>}
                          {convo.lastMsg.content}
                        </p>
                        {hasUnread && (
                          <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-purple-600 px-1.5 text-[10px] font-bold text-white">
                            {convo.unread > 9 ? '9+' : convo.unread}
                          </span>
                        )}
                      </div>
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

  // ── PRIVATE CHAT ──
  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden lg:h-screen" style={{ background: 'var(--bg)' }}>
      <div className="shrink-0 flex items-center gap-3 px-5 py-3.5" style={{ background: 'var(--hdr)', borderBottom: '1px solid var(--bd)', backdropFilter: 'blur(20px)' }}>
        <button
          onClick={() => { setDmView('list'); setSelectedPartner(null) }}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white/[0.07] hover:text-slate-200"
        >
          <ArrowRight size={17} />
        </button>
        {selectedPartner && (
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${avatarGrad(selectedPartner)} text-xs font-bold text-white shadow-md`}>
            {partnerProfile?.avatar_url
              ? <img src={partnerProfile.avatar_url} alt={dName(partnerProfile)} className="h-9 w-9 rounded-full object-cover" />
              : initials(dName(partnerProfile))
            }
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-bold text-white">{dName(partnerProfile)}</h2>
          {partnerProfile?.specialization && (
            <p className="text-xs text-slate-500">{partnerProfile.specialization}</p>
          )}
        </div>
        <Lock size={14} className="shrink-0 text-slate-600" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 lg:px-6">
        {currentConvMsgs.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: 'rgba(124,58,237,.1)', border: '1px solid rgba(124,58,237,.2)' }}>
              <Lock size={26} className="text-purple-400" />
            </div>
            <div>
              <p className="font-bold text-slate-200">{dName(partnerProfile)}</p>
              <p className="mt-1 text-sm text-slate-600">שלח הודעה ראשונה לפתוח את השיחה</p>
            </div>
          </div>
        )}

        <div className="space-y-1">
          {currentConvMsgs.map((msg, i) => {
            const isOwn = msg.sender_id === currentUserId
            const prev = currentConvMsgs[i - 1]
            const sameUser = prev?.sender_id === msg.sender_id
            const isTemp = msg.id.startsWith('temp-')
            const profile = isOwn ? currentProfile : partnerProfile
            const name = dName(profile)

            return (
              <div key={msg.id} className={`group flex items-end gap-2.5 ${isOwn ? 'flex-row-reverse' : ''} ${sameUser ? 'mt-0.5' : 'mt-4'}`}>
                {!sameUser ? (
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${avatarGrad(msg.sender_id)} text-xs font-bold text-white shadow-md`}>
                    {profile?.avatar_url
                      ? <img src={profile.avatar_url} alt={name} className="h-8 w-8 rounded-full object-cover" />
                      : initials(name)
                    }
                  </div>
                ) : <div className="w-8 shrink-0" />}

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
                    className={`relative rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${isTemp ? 'opacity-70' : ''}`}
                    style={isOwn
                      ? { background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 2px 12px rgba(124,58,237,.25)', color: 'white' }
                      : { background: 'var(--s2)', border: '1px solid var(--bd)', color: 'var(--tx2)' }
                    }
                  >
                    {msg.content}
                    {isTemp && <span className="absolute -bottom-4 end-0 text-[9px] text-slate-600">שולח...</span>}
                  </div>
                  {isOwn && !isTemp && msg.is_read && (
                    <span className="px-1 text-[10px] text-purple-400">✓✓ נקרא</span>
                  )}
                  {(isOwn || isAdmin) && !isTemp && (
                    <button
                      onClick={() => handleDeletePrivateMsg(msg.id)}
                      className="mt-0.5 flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] text-slate-700 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 size={10} />
                      מחק
                    </button>
                  )}
                  {sameUser && !(isOwn || isAdmin) && (
                    <span className="px-1 text-[10px] text-slate-700 opacity-0 transition-opacity group-hover:opacity-100">
                      {new Date(msg.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <div ref={privateBottomRef} />
      </div>

      <InputBar
        value={privateText}
        onChange={makeTextareaHandler(setPrivateText)}
        onKeyDown={handlePrivateKey}
        onSend={handlePrivateSend}
        isSending={isSendingP}
        textRef={privateTextRef}
      />
    </div>
  )
}

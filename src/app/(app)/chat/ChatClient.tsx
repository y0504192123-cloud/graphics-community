'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  Send, ArrowRight, X, Lock, Trash2,
  Search, UserPlus, Pin, Paperclip, Check, CheckCheck,
  MessageSquare, File as FileIcon, Edit2, CornerUpLeft, Smile, Users,
  Bell, BellOff,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Message, Profile, PrivateMessage } from '@/types'
import ReportButton from '@/components/ReportButton'

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

type ReactionGroup = { emoji: string; count: number; hasReacted: boolean }
type ReactionsMap = Record<string, ReactionGroup[]>

type Props = {
  generalTopicId: string | null
  currentUserId: string
  currentProfile: Profile | null
  isAdmin: boolean
  activeUsers: Profile[]
  sendMessage: (topicId: string, content: string, attUrl?: string, attType?: string, attName?: string, replyToId?: string) => Promise<void>
  editMessage: (id: string, content: string) => Promise<void>
  deleteMessage: (id: string) => Promise<void>
  toggleCommunityReaction: (messageId: string, emoji: string) => Promise<void>
  initialPrivateMessages: PrivateMessage[]
  sendPrivateMessage: (receiverId: string, content: string, attUrl?: string, attType?: string, attName?: string, replyToId?: string) => Promise<void>
  deletePrivateMessage: (id: string) => Promise<void>
  editPrivateMessage: (id: string, content: string) => Promise<void>
  toggleReaction: (messageId: string, emoji: string) => Promise<void>
  markMessagesRead: (senderId: string) => Promise<void>
  getChatUploadUrl: () => Promise<{ signedUrl?: string; publicUrl?: string; error?: string }>
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

// ─────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────

const GRADIENTS = [
  'from-violet-500 to-purple-700',
  'from-pink-500 to-rose-700',
  'from-blue-500 to-indigo-700',
  'from-emerald-500 to-teal-700',
  'from-amber-500 to-orange-700',
]

const EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🙏']

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function grad(uid: string) { return GRADIENTS[hashStr(uid) % GRADIENTS.length] }

function dName(p: Profile | null | undefined) { return p?.full_name ?? p?.username ?? 'משתמש' }

function initials(name: string) { return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() }

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
}

function fmtDateSep(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'היום'
  if (d.toDateString() === yesterday.toDateString()) return 'אתמול'
  return d.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })
}

function needsDateSep(curr: string, prev?: string): boolean {
  if (!prev) return true
  return new Date(curr).toDateString() !== new Date(prev).toDateString()
}

function groupReactions(rxns: { emoji: string; user_id: string }[], uid: string): ReactionGroup[] {
  const m: Record<string, ReactionGroup> = {}
  for (const r of rxns) {
    if (!m[r.emoji]) m[r.emoji] = { emoji: r.emoji, count: 0, hasReacted: false }
    m[r.emoji].count++
    if (r.user_id === uid) m[r.emoji].hasReacted = true
  }
  return Object.values(m)
}

function renderContent(content: string): React.ReactNode {
  const parts = content.split(/(@[^\s@]+)/g)
  return parts.map((part, i) =>
    part.startsWith('@')
      ? <span key={i} className="font-bold text-purple-400">{part}</span>
      : part
  )
}

// ─────────────────────────────────────────────────────────
// Small components
// ─────────────────────────────────────────────────────────

function AvatarBubble({ profile, uid, size = 9, online }: { profile?: Profile | null; uid: string; size?: number; online?: boolean }) {
  const sz = `h-${size} w-${size}`
  const textSz = size <= 8 ? 'text-xs' : 'text-sm'
  return (
    <div className="relative shrink-0">
      <div className={`${sz} shrink-0 rounded-full overflow-hidden bg-gradient-to-br ${grad(uid)} flex items-center justify-center ${textSz} font-bold text-white shadow-sm`}>
        {profile?.avatar_url
          ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
          : <span>{initials(dName(profile))}</span>
        }
      </div>
      {online && <span className="absolute bottom-0 end-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />}
    </div>
  )
}

function DateSepLine({ iso }: { iso: string }) {
  return (
    <div className="my-4 flex items-center gap-3">
      <div className="flex-1 h-px" style={{ background: 'var(--bd)' }} />
      <span className="rounded-full px-3 py-0.5 text-[11px] font-medium" style={{ background: 'var(--inp)', color: 'var(--tx3)', border: '1px solid var(--bd)' }}>
        {fmtDateSep(iso)}
      </span>
      <div className="flex-1 h-px" style={{ background: 'var(--bd)' }} />
    </div>
  )
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1">
      {[0, 1, 2].map(i => (
        <span key={i} className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
      ))}
    </div>
  )
}

function EmojiPickerRow({ onSelect }: { onSelect: (e: string) => void }) {
  return (
    <div className="flex items-center gap-0.5 rounded-2xl px-1.5 py-1 shadow-xl"
      style={{ background: 'var(--s1)', border: '1px solid var(--bd)' }}>
      {EMOJIS.map(e => (
        <button key={e} onClick={() => onSelect(e)}
          className="flex h-7 w-7 items-center justify-center rounded-xl text-base transition hover:scale-125 hover:bg-purple-50">
          {e}
        </button>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// InputBar
// ─────────────────────────────────────────────────────────

type InputBarProps = {
  value: string
  onChange: (v: string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onSend: () => void
  isSending: boolean
  textRef: React.RefObject<HTMLTextAreaElement | null>
  onAttachClick?: () => void
  attachments?: { name: string; type: string; preview?: string }[]
  onRemoveAttachment?: (idx: number) => void
  onImagePaste?: (file: File) => void
  isUploading?: boolean
  placeholder?: string
  replyTo?: { content: string | null; senderName: string } | null
  onCancelReply?: () => void
  mentionUsers?: Profile[]
  onMentionSelect?: (p: Profile) => void
}

function InputBar({ value, onChange, onKeyDown, onSend, isSending, textRef, onAttachClick, attachments = [], onRemoveAttachment, onImagePaste, isUploading, placeholder, replyTo, onCancelReply, mentionUsers, onMentionSelect }: InputBarProps) {
  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 140) + 'px'
  }
  const handlePasteInner = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'))
    const file = item?.getAsFile()
    if (file && onImagePaste) { e.preventDefault(); onImagePaste(file) }
  }
  const canSend = (value.trim() || attachments.length > 0) && !isSending && !isUploading

  return (
    <div className="shrink-0 px-3 py-2.5" style={{ background: 'var(--hdr)', borderTop: '1px solid var(--bd)' }}>
      {/* Mention dropdown */}
      {mentionUsers && mentionUsers.length > 0 && onMentionSelect && (
        <div className="mb-2 rounded-xl overflow-hidden" style={{ background: 'var(--s1)', border: '1px solid var(--bd)', boxShadow: '0 -4px 16px rgba(0,0,0,.08)' }}>
          {mentionUsers.map((u, idx) => (
            <button
              key={u.id}
              onMouseDown={e => { e.preventDefault(); onMentionSelect(u) }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-start transition hover:bg-purple-50/60"
              style={{ borderTop: idx > 0 ? '1px solid var(--bd)' : undefined }}
            >
              <AvatarBubble profile={u} uid={u.id} size={7} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold" style={{ color: 'var(--tx)' }}>{dName(u)}</p>
                {u.specialization && <p className="truncate text-[10px]" style={{ color: 'var(--tx3)' }}>{u.specialization}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
      {/* Reply preview */}
      {replyTo && (
        <div className="mb-2 flex items-start gap-2 rounded-xl px-3 py-2 border-s-2 border-purple-500" style={{ background: 'rgba(124,58,237,.07)' }}>
          <CornerUpLeft size={13} className="mt-0.5 shrink-0 text-purple-500" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-purple-600">{replyTo.senderName}</p>
            <p className="truncate text-xs" style={{ color: 'var(--tx3)' }}>{replyTo.content ?? '📎 קובץ'}</p>
          </div>
          <button onClick={onCancelReply} className="shrink-0 rounded p-0.5 hover:bg-red-500/10" style={{ color: 'var(--tx3)' }}>
            <X size={13} />
          </button>
        </div>
      )}
      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2 rounded-xl px-3 py-2" style={{ background: 'var(--inp)', border: '1px solid var(--bd)' }}>
          {attachments.map((att, idx) => (
            <div key={idx} className="relative">
              {att.type.startsWith('image/') && att.preview
                ? <img src={att.preview} alt="" className="h-14 w-14 rounded-lg object-cover" />
                : (
                  <div className="flex h-14 w-14 flex-col items-center justify-center gap-1 rounded-lg" style={{ background: 'var(--s1)' }}>
                    <FileIcon size={16} className="text-purple-500" />
                    <span className="w-full truncate px-1 text-center text-[9px]" style={{ color: 'var(--tx3)' }}>{att.name}</span>
                  </div>
                )
              }
              <button
                onClick={() => onRemoveAttachment?.(idx)}
                className="absolute -end-1.5 -top-1.5 rounded-full p-0.5 transition hover:opacity-80"
                style={{ background: 'rgba(0,0,0,.7)', color: 'white' }}
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2 rounded-2xl px-2 py-1.5" style={{ background: 'var(--inp)', border: '1px solid var(--bd)' }}>
        {onAttachClick && (
          <button onClick={onAttachClick} className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition hover:bg-slate-100" style={{ color: isUploading ? '#a855f7' : 'var(--tx3)' }}>
            {isUploading ? <div className="h-4 w-4 rounded-full border-2 border-purple-400 border-t-transparent animate-spin" /> : <Paperclip size={16} />}
          </button>
        )}
        <textarea
          ref={textRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onInput={handleInput}
          onKeyDown={onKeyDown}
          onPaste={handlePasteInner}
          rows={1}
          placeholder={placeholder ?? 'כתוב הודעה...'}
          className="flex-1 resize-none bg-transparent py-1.5 text-sm leading-relaxed outline-none placeholder:text-slate-400"
          style={{ color: 'var(--tx)', maxHeight: '140px', overflowY: 'auto' }}
        />
        <button
          onClick={onSend}
          disabled={!canSend}
          className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white transition-all hover:scale-105 disabled:opacity-30"
          style={{ background: canSend ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : 'var(--inp)' }}
        >
          <Send size={15} className={canSend ? 'text-white' : 'text-slate-400'} />
        </button>
      </div>
      <p className="mt-1 text-center text-[10px]" style={{ color: 'var(--tx3)' }}>Enter לשליחה · Shift+Enter לשורה חדשה</p>
    </div>
  )
}

function playPing() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3)
    gain.gain.setValueAtTime(0.25, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.4)
    osc.onended = () => ctx.close()
  } catch {}
}

// ─────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────

export default function ChatClient({
  generalTopicId,
  currentUserId, currentProfile, isAdmin, activeUsers,
  sendMessage, editMessage, deleteMessage, toggleCommunityReaction,
  initialPrivateMessages,
  sendPrivateMessage, deletePrivateMessage, editPrivateMessage, toggleReaction,
  markMessagesRead, getChatUploadUrl,
  initialDmUserId, initialDmProfile, initialJobQuote,
}: Props) {

  // ── Layout ──
  const [mobileShowChat, setMobileShowChat] = useState(!!initialDmUserId)
  const [activeSide, setActiveSide] = useState<'community' | 'private'>(initialDmUserId ? 'private' : 'community')

  // ── Community state ──
  const [communityMsgs, setCommunityMsgs] = useState<Message[]>([])
  const [communityText, setCommunityText] = useState('')
  const [isSendingC, setIsSendingC] = useState(false)
  const [communityReplyTo, setCommunityReplyTo] = useState<Message | null>(null)
  const [communityReactionsMap, setCommunityReactionsMap] = useState<ReactionsMap>({})
  const [communityEmojiPickerFor, setCommunityEmojiPickerFor] = useState<string | null>(null)
  const [communityEditingId, setCommunityEditingId] = useState<string | null>(null)
  const [communityEditText, setCommunityEditText] = useState('')

  // ── Mention state (shared) ──
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)

  // ── Private state ──
  const [privateMsgs, setPrivateMsgs] = useState<PrivateMessage[]>(initialPrivateMessages)
  const [selectedPartner, setSelectedPartner] = useState<string | null>(initialDmUserId)
  const [privateText, setPrivateText] = useState(initialJobQuote ?? '')
  const [isSendingP, setIsSendingP] = useState(false)
  const [showNewChat, setShowNewChat] = useState(false)
  const [userSearch, setUserSearch] = useState('')

  // ── Realtime / UI state ──
  const [partnerTyping, setPartnerTyping] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const [privateSearch, setPrivateSearch] = useState('')
  const [showPrivateSearch, setShowPrivateSearch] = useState(false)
  const [pinnedMsgId, setPinnedMsgId] = useState<string | null>(null)
  const [attachFiles, setAttachFiles] = useState<File[]>([])
  const [attachPreviews, setAttachPreviews] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)

  // ── Edit / Reply / Reactions ──
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [replyTo, setReplyTo] = useState<PrivateMessage | null>(null)
  const [reactionsMap, setReactionsMap] = useState<ReactionsMap>({})
  const [emojiPickerFor, setEmojiPickerFor] = useState<string | null>(null)

  // ── Sound ──
  const [isMuted, setIsMuted] = useState(() => typeof window !== 'undefined' && localStorage.getItem('chatMuted') === '1')
  const isMutedRef = useRef(isMuted)
  isMutedRef.current = isMuted
  const toggleMute = () => {
    const next = !isMuted
    setIsMuted(next)
    try { localStorage.setItem('chatMuted', next ? '1' : '0') } catch {}
  }

  // ── Refs ──
  const communityBottomRef = useRef<HTMLDivElement>(null)
  const privateBottomRef   = useRef<HTMLDivElement>(null)
  const communityScrollRef = useRef<HTMLDivElement>(null)
  const privateScrollRef   = useRef<HTMLDivElement>(null)
  const communityTextRef   = useRef<HTMLTextAreaElement>(null)
  const privateTextRef     = useRef<HTMLTextAreaElement>(null)
  const fileInputRef       = useRef<HTMLInputElement>(null)
  const selectedPartnerRef = useRef<string | null>(selectedPartner)
  selectedPartnerRef.current = selectedPartner
  const privateMsgsRef = useRef<PrivateMessage[]>(privateMsgs)
  privateMsgsRef.current = privateMsgs
  const markReadRef = useRef(markMessagesRead)
  markReadRef.current = markMessagesRead
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const supabase = useMemo(() => createClient(), [])

  // ── Load reactions on mount ──
  useEffect(() => {
    const ids = initialPrivateMessages.filter(m => !String(m.id).startsWith('temp-')).map(m => m.id)
    if (!ids.length) return
    supabase.from('message_reactions').select('message_id, emoji, user_id').in('message_id', ids).then(({ data }) => {
      if (!data?.length) return
      const newMap: ReactionsMap = {}
      for (const id of ids) {
        const rxns = data.filter(r => r.message_id === id)
        if (rxns.length) newMap[id] = groupReactions(rxns, currentUserId)
      }
      setReactionsMap(newMap)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Realtime: reactions ──
  useEffect(() => {
    let active = true
    const ch = supabase.channel('rt-reactions')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'message_reactions' }, async (payload) => {
        const msgId = (payload.new as { message_id?: string })?.message_id
        if (!msgId || !active) return
        const { data } = await supabase.from('message_reactions').select('emoji, user_id').eq('message_id', msgId)
        if (active) setReactionsMap(prev => ({ ...prev, [msgId]: groupReactions(data ?? [], currentUserId) }))
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'message_reactions' }, async (payload) => {
        const msgId = (payload.new as { message_id?: string })?.message_id
        if (!msgId || !active) return
        const { data } = await supabase.from('message_reactions').select('emoji, user_id').eq('message_id', msgId)
        if (active) setReactionsMap(prev => ({ ...prev, [msgId]: groupReactions(data ?? [], currentUserId) }))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'message_reactions' }, async (payload) => {
        // DELETE payload.old may be empty without REPLICA IDENTITY FULL — fall back to reloading current conversation
        const msgId = (payload.old as { message_id?: string })?.message_id
        if (!active) return
        if (msgId) {
          const { data } = await supabase.from('message_reactions').select('emoji, user_id').eq('message_id', msgId)
          if (active) setReactionsMap(prev => ({ ...prev, [msgId]: groupReactions(data ?? [], currentUserId) }))
        } else {
          // Reload reactions for entire current conversation
          const partner = selectedPartnerRef.current
          if (!partner) return
          const ids = privateMsgsRef.current
            .filter(m => !String(m.id).startsWith('temp-') && (
              (m.sender_id === currentUserId && m.receiver_id === partner) ||
              (m.sender_id === partner && m.receiver_id === currentUserId)
            ))
            .map(m => m.id)
          if (!ids.length) return
          const { data } = await supabase.from('message_reactions').select('message_id, emoji, user_id').in('message_id', ids)
          if (!active || !data) return
          const patch: ReactionsMap = {}
          for (const id of ids) {
            patch[id] = groupReactions(data.filter(r => r.message_id === id), currentUserId)
          }
          setReactionsMap(prev => ({ ...prev, ...patch }))
        }
      })
      .subscribe()
    return () => { active = false; supabase.removeChannel(ch) }
  }, [supabase, currentUserId])

  // ── Online presence ──
  useEffect(() => {
    const ch = supabase.channel('online-users')
      .on('presence', { event: 'sync' }, () => {
        const state = ch.presenceState<{ userId: string }>()
        const ids = new Set<string>()
        Object.values(state).flat().forEach((p: any) => ids.add(p.userId))
        setOnlineUsers(ids)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await ch.track({ userId: currentUserId })
      })
    return () => { supabase.removeChannel(ch) }
  }, [currentUserId, supabase])

  // ── Typing + per-conversation broadcast (delete / edit) ──
  useEffect(() => {
    if (!selectedPartner) { setPartnerTyping(false); return }
    const key = [currentUserId, selectedPartner].sort().join('_')
    const ch = supabase.channel(`conv-${key}`)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload?.userId === selectedPartner) {
          setPartnerTyping(true)
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
          typingTimeoutRef.current = setTimeout(() => setPartnerTyping(false), 3000)
        }
      })
      .on('broadcast', { event: 'msg_delete' }, ({ payload }) => {
        if (!payload?.msgId) return
        setPrivateMsgs(prev => prev.map(m =>
          m.id === payload.msgId ? { ...m, deleted_for_all: true, content: null, attachment_url: null } : m
        ))
      })
      .on('broadcast', { event: 'msg_edit' }, ({ payload }) => {
        if (!payload?.msgId) return
        setPrivateMsgs(prev => prev.map(m =>
          m.id === payload.msgId ? { ...m, content: payload.content, edited_at: payload.editedAt } : m
        ))
      })
      .subscribe()
    typingChannelRef.current = ch
    return () => {
      supabase.removeChannel(ch)
      typingChannelRef.current = null
      if (typingTimeoutRef.current) { clearTimeout(typingTimeoutRef.current); typingTimeoutRef.current = null }
    }
  }, [selectedPartner, currentUserId, supabase])

  const broadcastTyping = useCallback(() => {
    typingChannelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { userId: currentUserId } })
  }, [currentUserId])

  // ── Auto-load general community topic ──
  useEffect(() => {
    if (!generalTopicId) return
    supabase.from('messages')
      .select('id,content,created_at,user_id,channel_id,edited_at,attachment_url,attachment_type,attachment_name,reply_to_id,reply_to:messages!reply_to_id(id,content,user_id),profiles(id,full_name,username,avatar_url)')
      .eq('channel_id', generalTopicId).order('created_at', { ascending: true }).limit(100)
      .then(({ data }) => {
        setCommunityMsgs((data as unknown as Message[]) ?? [])
        const ids = (data ?? []).map((m: any) => m.id)
        if (!ids.length) return
        supabase.from('community_reactions').select('message_id, emoji, user_id').in('message_id', ids).then(({ data: rxns }) => {
          if (!rxns?.length) return
          const map: ReactionsMap = {}
          for (const id of ids) {
            const rows = rxns.filter((r: any) => r.message_id === id)
            if (rows.length) map[id] = groupReactions(rows, currentUserId)
          }
          setCommunityReactionsMap(map)
        })
      })
  }, [generalTopicId, supabase]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Realtime: community messages ──
  useEffect(() => {
    if (!generalTopicId) return
    const ch = supabase.channel(`rt-msgs-${generalTopicId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${generalTopicId}` }, async (payload) => {
        const m = payload.new as Message
        const { data: prof } = await supabase.from('profiles').select('id,full_name,username,avatar_url').eq('id', m.user_id).single()
        setCommunityMsgs(prev => {
          const deduped = prev.filter(x => !(String(x.id).startsWith('temp-') && x.user_id === m.user_id && x.content === m.content))
          if (deduped.some(x => String(x.id) === String(m.id))) return deduped
          return [...deduped, { ...m, profiles: prof as Profile | undefined ?? undefined }]
        })
        if (m.user_id !== currentUserId && !isMutedRef.current) {
          const el = communityScrollRef.current
          const atBottom = !el || el.scrollHeight - el.scrollTop - el.clientHeight < 80
          if (document.hidden || !atBottom) playPing()
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages', filter: `channel_id=eq.${generalTopicId}` }, (payload) => {
        const old = payload.old as { id: string }
        setCommunityMsgs(prev => prev.filter(m => m.id !== old.id))
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [generalTopicId, supabase])

  // ── Realtime: community reactions ──
  useEffect(() => {
    if (!generalTopicId) return
    let active = true
    const reload = async (msgId: string) => {
      const { data } = await supabase.from('community_reactions').select('emoji, user_id').eq('message_id', msgId)
      if (active) setCommunityReactionsMap(prev => ({ ...prev, [msgId]: groupReactions(data ?? [], currentUserId) }))
    }
    const ch = supabase.channel('rt-community-reactions')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_reactions' }, (p) => { const id = (p.new as any)?.message_id; if (id && active) reload(id) })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'community_reactions' }, (p) => { const id = (p.new as any)?.message_id; if (id && active) reload(id) })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'community_reactions' }, (p) => {
        const id = (p.old as any)?.message_id
        if (!active) return
        if (id) reload(id)
      })
      .subscribe()
    return () => { active = false; supabase.removeChannel(ch) }
  }, [generalTopicId, supabase, currentUserId])

  // ── Realtime: private messages ──
  useEffect(() => {
    let active = true
    const ch = supabase.channel('rt-private')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'private_messages' }, (payload) => {
        if (!active) return
        const u = payload.new as PrivateMessage
        setPrivateMsgs(prev => prev.map(m => m.id === u.id ? { ...m, ...u } : m))
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'private_messages' }, async (payload) => {
        const m = payload.new as PrivateMessage
        if (m.sender_id !== currentUserId && m.receiver_id !== currentUserId) return
        const [{ data: sp }, { data: rp }] = await Promise.all([
          supabase.from('profiles').select('id,full_name,username,avatar_url').eq('id', m.sender_id).single(),
          supabase.from('profiles').select('id,full_name,username,avatar_url').eq('id', m.receiver_id).single(),
        ])
        if (!active) return
        setPrivateMsgs(prev => {
          const replyToMsg = m.reply_to_id ? (prev.find(x => x.id === m.reply_to_id) ?? null) : null
          const full: PrivateMessage = { ...m, sender: sp as Profile | undefined ?? undefined, receiver: rp as Profile | undefined ?? undefined, reply_to: replyToMsg }
          if (prev.some(x => String(x.id) === String(m.id))) return prev
          if (m.sender_id === currentUserId) {
            const deduped = prev.filter(x => !(String(x.id).startsWith('temp-') && x.sender_id === currentUserId && x.receiver_id === m.receiver_id && x.content === m.content))
            return [...deduped, full]
          }
          return [...prev, full]
        })
        if (m.receiver_id === currentUserId && selectedPartnerRef.current === m.sender_id) {
          markReadRef.current(m.sender_id)
          setPrivateMsgs(prev => prev.map(x => x.sender_id === m.sender_id && x.receiver_id === currentUserId && !x.is_read ? { ...x, is_read: true } : x))
        }
        if (m.sender_id !== currentUserId && m.receiver_id === currentUserId && !isMutedRef.current) {
          const el = privateScrollRef.current
          const atBottom = !el || el.scrollHeight - el.scrollTop - el.clientHeight < 80
          if (document.hidden || !atBottom) playPing()
        }
      })
      .subscribe()
    return () => { active = false; supabase.removeChannel(ch) }
  }, [supabase, currentUserId])

  // ── Auto-scroll ──
  useEffect(() => { communityBottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [communityMsgs])
  useEffect(() => { privateBottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [privateMsgs, selectedPartner])


  // ── Computed ──
  const convos: Convo[] = useMemo(() => {
    const map = new Map<string, { msgs: PrivateMessage[], profile: Profile | null }>()
    for (const m of privateMsgs) {
      const partnerId = m.sender_id === currentUserId ? m.receiver_id : m.sender_id
      const prof = m.sender_id === currentUserId ? (m.receiver as Profile | undefined ?? null) : (m.sender as Profile | undefined ?? null)
      if (!map.has(partnerId)) map.set(partnerId, { msgs: [], profile: null })
      const entry = map.get(partnerId)!
      entry.msgs.push(m)
      if (!entry.profile && prof) entry.profile = prof
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

  const currentConvMsgs = useMemo(() => {
    if (!selectedPartner) return []
    const msgs = privateMsgs.filter(m =>
      (m.sender_id === currentUserId && m.receiver_id === selectedPartner) ||
      (m.sender_id === selectedPartner && m.receiver_id === currentUserId)
    )
    if (!privateSearch.trim()) return msgs
    return msgs.filter(m => m.content?.toLowerCase().includes(privateSearch.toLowerCase()) || m.attachment_name?.toLowerCase().includes(privateSearch.toLowerCase()))
  }, [privateMsgs, selectedPartner, currentUserId, privateSearch])

  const partnerProfile = useMemo(() => {
    if (!selectedPartner) return null
    if (selectedPartner === initialDmUserId && initialDmProfile) return initialDmProfile
    return convos.find(c => c.partnerId === selectedPartner)?.profile
      ?? activeUsers.find(u => u.id === selectedPartner)
      ?? null
  }, [selectedPartner, convos, initialDmUserId, initialDmProfile, activeUsers])

  const pinnedMsg = useMemo(() =>
    pinnedMsgId ? currentConvMsgs.find(m => m.id === pinnedMsgId) ?? null : null,
    [pinnedMsgId, currentConvMsgs]
  )

  const filteredUsers = activeUsers.filter(u => {
    const q = userSearch.toLowerCase()
    return !q || (u.full_name ?? '').toLowerCase().includes(q) || (u.username ?? '').toLowerCase().includes(q)
  })

  // ── Handlers ──

  const openCommunity = () => {
    setActiveSide('community')
    setSelectedPartner(null)
    setMobileShowChat(true)
  }

  const openConversation = async (partnerId: string) => {
    setSelectedPartner(partnerId)
    setActiveSide('private')
    setMobileShowChat(true)
    setShowPrivateSearch(false)
    setPrivateSearch('')
    setPinnedMsgId(null)
    setReplyTo(null)
    setEditingMsgId(null)
    setPrivateMsgs(prev => prev.map(m =>
      m.sender_id === partnerId && m.receiver_id === currentUserId && !m.is_read
        ? { ...m, is_read: true } : m
    ))
    await markMessagesRead(partnerId)
    // Load reactions for this conversation
    const ids = privateMsgs
      .filter(m => !String(m.id).startsWith('temp-') && (
        (m.sender_id === currentUserId && m.receiver_id === partnerId) ||
        (m.sender_id === partnerId && m.receiver_id === currentUserId)
      ))
      .map(m => m.id)
    if (ids.length) {
      const { data } = await supabase.from('message_reactions').select('message_id, emoji, user_id').in('message_id', ids)
      if (data?.length) {
        const patch: ReactionsMap = {}
        for (const id of ids) {
          const rxns = data.filter(r => r.message_id === id)
          if (rxns.length) patch[id] = groupReactions(rxns, currentUserId)
        }
        setReactionsMap(prev => ({ ...prev, ...patch }))
      }
    }
  }

  const addAttachFile = (file: File) => {
    setAttachFiles(prev => [...prev, file])
    setAttachPreviews(prev => [...prev, file.type.startsWith('image/') ? URL.createObjectURL(file) : ''])
  }

  const removeAttach = (idx: number) => {
    setAttachFiles(prev => prev.filter((_, i) => i !== idx))
    setAttachPreviews(prev => prev.filter((_, i) => i !== idx))
  }

  const handleCommunitySend = async () => {
    if ((!communityText.trim() && !attachFiles.length) || !generalTopicId || isSendingC) return
    const content = communityText.trim()
    const currentReplyTo = communityReplyTo
    setCommunityReplyTo(null)
    setMentionQuery(null)

    if (attachFiles.length > 0) {
      setIsUploading(true)
      try {
        const urls: string[] = []
        for (const file of attachFiles) {
          const { signedUrl, publicUrl, error } = await getChatUploadUrl()
          if (error || !signedUrl || !publicUrl) continue
          await fetch(signedUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
          urls.push(publicUrl)
        }
        if (!urls.length) return
        const allImages = attachFiles.every(f => f.type.startsWith('image/'))
        const attUrl = urls.length === 1 ? urls[0] : JSON.stringify(urls)
        const attType = !allImages ? 'file' : urls.length === 1 ? 'image' : 'images'
        const attName = attachFiles.length === 1 ? attachFiles[0].name : `${attachFiles.length} תמונות`
        setCommunityMsgs(prev => [...prev, {
          id: `temp-${Date.now()}`, channel_id: generalTopicId, user_id: currentUserId,
          content: content || null, created_at: new Date().toISOString(),
          attachment_url: attUrl, attachment_type: attType, attachment_name: attName,
          reply_to_id: currentReplyTo?.id ?? null, reply_to: currentReplyTo ? { id: currentReplyTo.id, content: currentReplyTo.content, user_id: currentReplyTo.user_id } : null,
          profiles: currentProfile ?? undefined,
        }])
        setCommunityText('')
        if (communityTextRef.current) communityTextRef.current.style.height = 'auto'
        await sendMessage(generalTopicId, content, attUrl, attType, attName, currentReplyTo?.id)
      } finally {
        setIsUploading(false)
        setAttachFiles([])
        setAttachPreviews([])
      }
      return
    }

    setCommunityText('')
    if (communityTextRef.current) communityTextRef.current.style.height = 'auto'
    setCommunityMsgs(prev => [...prev, {
      id: `temp-${Date.now()}`, channel_id: generalTopicId, user_id: currentUserId,
      content, created_at: new Date().toISOString(),
      reply_to_id: currentReplyTo?.id ?? null, reply_to: currentReplyTo ? { id: currentReplyTo.id, content: currentReplyTo.content, user_id: currentReplyTo.user_id } : null,
      profiles: currentProfile ?? undefined,
    }])
    setIsSendingC(true)
    try { await sendMessage(generalTopicId, content, undefined, undefined, undefined, currentReplyTo?.id) } finally { setIsSendingC(false) }
  }

  const handlePrivateSend = async () => {
    if ((!privateText.trim() && !attachFiles.length) || !selectedPartner || isSendingP) return
    const content = privateText.trim()
    const currentReplyTo = replyTo
    setReplyTo(null)

    if (attachFiles.length > 0) {
      setIsUploading(true)
      try {
        const urls: string[] = []
        for (const file of attachFiles) {
          const { signedUrl, publicUrl, error } = await getChatUploadUrl()
          if (error || !signedUrl || !publicUrl) continue
          await fetch(signedUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
          urls.push(publicUrl)
        }
        if (!urls.length) return
        const allImages = attachFiles.every(f => f.type.startsWith('image/'))
        const attUrl = urls.length === 1 ? urls[0] : JSON.stringify(urls)
        const attType = !allImages ? 'file' : urls.length === 1 ? 'image' : 'images'
        const attName = attachFiles.length === 1 ? attachFiles[0].name : `${attachFiles.length} תמונות`
        setPrivateMsgs(prev => [...prev, {
          id: `temp-${Date.now()}`, sender_id: currentUserId, receiver_id: selectedPartner,
          content: content || null, job_id: null, is_read: false, created_at: new Date().toISOString(),
          attachment_url: attUrl, attachment_type: attType, attachment_name: attName,
          reply_to_id: currentReplyTo?.id ?? null, reply_to: currentReplyTo ? { id: currentReplyTo.id, content: currentReplyTo.content, sender_id: currentReplyTo.sender_id } : null,
          sender: currentProfile ?? undefined,
        }])
        await sendPrivateMessage(selectedPartner, content, attUrl, attType, attName, currentReplyTo?.id)
      } finally {
        setIsUploading(false)
        setAttachFiles([])
        setAttachPreviews([])
        setPrivateText('')
        if (privateTextRef.current) privateTextRef.current.style.height = 'auto'
      }
      return
    }

    setPrivateText('')
    if (privateTextRef.current) privateTextRef.current.style.height = 'auto'
    setPrivateMsgs(prev => [...prev, {
      id: `temp-${Date.now()}`, sender_id: currentUserId, receiver_id: selectedPartner,
      content, job_id: null, is_read: false, created_at: new Date().toISOString(),
      reply_to_id: currentReplyTo?.id ?? null,
      reply_to: currentReplyTo ? { id: currentReplyTo.id, content: currentReplyTo.content, sender_id: currentReplyTo.sender_id } : null,
      sender: currentProfile ?? undefined,
    }])
    setIsSendingP(true)
    try { await sendPrivateMessage(selectedPartner, content, undefined, undefined, undefined, currentReplyTo?.id) } finally { setIsSendingP(false) }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    files.forEach(addAttachFile)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDeletePrivate = async (msgId: string) => {
    setPrivateMsgs(prev => prev.map(m => m.id === msgId ? { ...m, deleted_for_all: true, content: null, attachment_url: null } : m))
    typingChannelRef.current?.send({ type: 'broadcast', event: 'msg_delete', payload: { msgId } })
    await deletePrivateMessage(msgId)
  }

  const handleEditSave = async () => {
    if (!editingMsgId || !editingText.trim()) return
    const id = editingMsgId
    const content = editingText.trim()
    const editedAt = new Date().toISOString()
    setPrivateMsgs(prev => prev.map(m => m.id === id ? { ...m, content, edited_at: editedAt } : m))
    setEditingMsgId(null)
    setEditingText('')
    typingChannelRef.current?.send({ type: 'broadcast', event: 'msg_edit', payload: { msgId: id, content, editedAt } })
    await editPrivateMessage(id, content)
  }

  const handleReaction = async (msgId: string, emoji: string) => {
    setEmojiPickerFor(null)
    // Optimistic update — user can only have one reaction per message
    setReactionsMap(prev => {
      const existing = (prev[msgId] ?? []).map(r => ({ ...r }))
      const prevUserReaction = existing.find(r => r.hasReacted)
      if (prevUserReaction) {
        if (prevUserReaction.emoji === emoji) {
          // Toggle off
          const idx = existing.findIndex(r => r.emoji === emoji)
          if (existing[idx].count <= 1) existing.splice(idx, 1)
          else existing[idx] = { ...existing[idx], count: existing[idx].count - 1, hasReacted: false }
        } else {
          // Switch emoji: remove old
          const oldIdx = existing.findIndex(r => r.emoji === prevUserReaction.emoji)
          if (existing[oldIdx].count <= 1) existing.splice(oldIdx, 1)
          else existing[oldIdx] = { ...existing[oldIdx], count: existing[oldIdx].count - 1, hasReacted: false }
          // Add new
          const newIdx = existing.findIndex(r => r.emoji === emoji)
          if (newIdx >= 0) existing[newIdx] = { ...existing[newIdx], count: existing[newIdx].count + 1, hasReacted: true }
          else existing.push({ emoji, count: 1, hasReacted: true })
        }
      } else {
        const idx = existing.findIndex(r => r.emoji === emoji)
        if (idx >= 0) existing[idx] = { ...existing[idx], count: existing[idx].count + 1, hasReacted: true }
        else existing.push({ emoji, count: 1, hasReacted: true })
      }
      return { ...prev, [msgId]: existing }
    })
    await toggleReaction(msgId, emoji)
  }

  const handleDeleteCommunity = (msgId: string) => {
    setCommunityMsgs(prev => prev.filter(m => m.id !== msgId))
    deleteMessage(msgId)
  }

  const handleCommunityReaction = async (msgId: string, emoji: string) => {
    setCommunityEmojiPickerFor(null)
    setCommunityReactionsMap(prev => {
      const existing = (prev[msgId] ?? []).map(r => ({ ...r }))
      const prevUserRxn = existing.find(r => r.hasReacted)
      if (prevUserRxn) {
        if (prevUserRxn.emoji === emoji) {
          const idx = existing.findIndex(r => r.emoji === emoji)
          if (existing[idx].count <= 1) existing.splice(idx, 1)
          else existing[idx] = { ...existing[idx], count: existing[idx].count - 1, hasReacted: false }
        } else {
          const oldIdx = existing.findIndex(r => r.emoji === prevUserRxn.emoji)
          if (existing[oldIdx].count <= 1) existing.splice(oldIdx, 1)
          else existing[oldIdx] = { ...existing[oldIdx], count: existing[oldIdx].count - 1, hasReacted: false }
          const newIdx = existing.findIndex(r => r.emoji === emoji)
          if (newIdx >= 0) existing[newIdx] = { ...existing[newIdx], count: existing[newIdx].count + 1, hasReacted: true }
          else existing.push({ emoji, count: 1, hasReacted: true })
        }
      } else {
        const idx = existing.findIndex(r => r.emoji === emoji)
        if (idx >= 0) existing[idx] = { ...existing[idx], count: existing[idx].count + 1, hasReacted: true }
        else existing.push({ emoji, count: 1, hasReacted: true })
      }
      return { ...prev, [msgId]: existing }
    })
    await toggleCommunityReaction(msgId, emoji)
  }

  const handleCommunityEditSave = async (msgId: string) => {
    if (!communityEditText.trim()) return
    const content = communityEditText.trim()
    const editedAt = new Date().toISOString()
    setCommunityMsgs(prev => prev.map(m => m.id === msgId ? { ...m, content, edited_at: editedAt } : m))
    setCommunityEditingId(null)
    setCommunityEditText('')
    await editMessage(msgId, content)
  }

  // ── Mention helpers ──

  function getMentionQuery(text: string): string | null {
    const match = text.match(/@([^\s@]*)$/)
    return match !== null ? match[1] : null
  }

  function insertMention(text: string, profile: Profile): string {
    const name = profile.full_name?.split(' ')[0] ?? profile.username ?? 'user'
    return text.replace(/@([^\s@]*)$/, `@${name} `)
  }

  const mentionedUsers = mentionQuery !== null
    ? activeUsers.filter(u => {
        const q = mentionQuery.toLowerCase()
        return !q || (u.full_name ?? '').toLowerCase().includes(q) || (u.username ?? '').toLowerCase().includes(q)
      }).slice(0, 6)
    : []

  const handleMentionSelect = (profile: Profile) => {
    if (activeSide === 'community') {
      setCommunityText(insertMention(communityText, profile))
      communityTextRef.current?.focus()
    } else {
      setPrivateText(insertMention(privateText, profile))
      privateTextRef.current?.focus()
    }
    setMentionQuery(null)
  }

  const handleCommunityKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setMentionQuery(null); return }
    if (e.key === 'Enter' && !e.shiftKey && mentionQuery === null) { e.preventDefault(); handleCommunitySend() }
  }
  const handlePrivateKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setMentionQuery(null); return }
    if (e.key === 'Enter' && !e.shiftKey && mentionQuery === null) { e.preventDefault(); handlePrivateSend() }
  }

  // ─────────────────────────────────────────────────────────
  // LEFT PANEL
  // ─────────────────────────────────────────────────────────

  const leftPanel = (
    <div className="flex h-full flex-col" style={{ background: 'var(--s1)' }}>

      {/* Header: new DM button */}
      <div className="shrink-0 px-3 pt-3 pb-2" style={{ borderBottom: '1px solid var(--bd)' }}>
        <button
          onClick={() => { setShowNewChat(s => !s); setUserSearch('') }}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold text-white transition hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}
        >
          {showNewChat ? <X size={13} /> : <UserPlus size={13} />}
          {showNewChat ? 'ביטול' : 'צ׳אט חדש'}
        </button>
      </div>

      {/* New DM search panel */}
      {showNewChat && (
        <div className="shrink-0" style={{ borderBottom: '1px solid var(--bd)' }}>
          <div className="px-3 py-2">
            <div className="flex items-center gap-2 rounded-xl px-2.5 py-1.5" style={{ background: 'var(--inp)', border: '1px solid var(--bd)' }}>
              <Search size={13} style={{ color: 'var(--tx3)' }} />
              <input autoFocus value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="חפש..." className="flex-1 bg-transparent text-xs outline-none placeholder:text-slate-400" style={{ color: 'var(--tx)' }} />
              {userSearch && <button onClick={() => setUserSearch('')} style={{ color: 'var(--tx3)' }}><X size={12} /></button>}
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filteredUsers.length === 0
              ? <p className="py-4 text-center text-xs" style={{ color: 'var(--tx3)' }}>לא נמצאו משתמשים</p>
              : filteredUsers.map(u => (
                <button
                  key={u.id}
                  onClick={() => { setShowNewChat(false); setUserSearch(''); openConversation(u.id) }}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-start transition hover:bg-slate-50"
                >
                  <AvatarBubble profile={u} uid={u.id} size={8} online={onlineUsers.has(u.id)} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold" style={{ color: 'var(--tx)' }}>{dName(u)}</p>
                    {u.specialization && <p className="truncate text-[10px]" style={{ color: 'var(--tx3)' }}>{u.specialization}</p>}
                  </div>
                  {convos.some(c => c.partnerId === u.id) && <span className="shrink-0 text-[10px] text-purple-600">קיים</span>}
                </button>
              ))
            }
          </div>
        </div>
      )}

      {/* Unified list */}
      <div className="flex-1 overflow-y-auto">

        {/* Community room — always first */}
        <button
          onClick={openCommunity}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-start transition hover:bg-purple-50/40"
          style={{
            borderBottom: '1px solid var(--bd)',
            background: activeSide === 'community' ? 'rgba(124,58,237,.07)' : undefined,
          }}
        >
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{
              background: activeSide === 'community' ? 'rgba(124,58,237,.18)' : 'rgba(124,58,237,.09)',
              border: '1px solid rgba(124,58,237,.2)',
            }}
          >
            <Users size={18} className="text-purple-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-sm" style={{ color: activeSide === 'community' ? '#7c3aed' : 'var(--tx)' }}>
              צ׳אט מרכזי
            </p>
            <p className="mt-0.5 text-[11px]" style={{ color: 'var(--tx3)' }}>צ׳אט כללי לכל חברי הקהילה</p>
          </div>
          {activeSide === 'community' && (
            <span className="absolute end-0 h-8 w-1 rounded-s-full bg-purple-600" />
          )}
        </button>

        {/* Private conversations */}
        {convos.map(convo => {
          const name = dName(convo.profile)
          const hasUnread = convo.unread > 0
          const active = activeSide === 'private' && selectedPartner === convo.partnerId
          const isOnline = onlineUsers.has(convo.partnerId)
          const lastContent = convo.lastMsg.deleted_for_all
            ? 'הודעה נמחקה'
            : convo.lastMsg.attachment_url
              ? (convo.lastMsg.attachment_type === 'image' ? '📷 תמונה' : '📎 קובץ')
              : (convo.lastMsg.content ?? '')
          return (
            <button
              key={convo.partnerId}
              onClick={() => openConversation(convo.partnerId)}
              className="relative flex w-full items-center gap-3 px-3 py-3.5 text-start transition hover:bg-slate-50/60"
              style={{ borderBottom: '1px solid var(--bd)', background: active ? 'rgba(124,58,237,.06)' : undefined }}
            >
              <AvatarBubble profile={convo.profile} uid={convo.partnerId} size={10} online={isOnline} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="truncate text-sm font-semibold" style={{ color: hasUnread ? '#6b21a8' : 'var(--tx)' }}>{name}</span>
                  <span className="shrink-0 text-[10px]" style={{ color: 'var(--tx3)' }}>{fmtTime(convo.lastMsg.created_at)}</span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-1">
                  <p className="truncate text-xs" style={{ color: hasUnread ? 'var(--tx2)' : 'var(--tx3)', fontStyle: convo.lastMsg.deleted_for_all ? 'italic' : undefined }}>
                    {convo.lastMsg.sender_id === currentUserId && <span style={{ color: 'var(--tx3)' }}>אתה: </span>}
                    {lastContent}
                  </p>
                  {hasUnread && (
                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-purple-600 px-1.5 text-[10px] font-bold text-white">
                      {convo.unread > 9 ? '9+' : convo.unread}
                    </span>
                  )}
                </div>
              </div>
              {active && <span className="absolute end-0 h-8 w-1 rounded-s-full bg-purple-600" />}
            </button>
          )
        })}

        {convos.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-center px-4">
            <Lock size={20} className="text-slate-300" />
            <p className="text-xs" style={{ color: 'var(--tx3)' }}>לחץ "צ׳אט חדש" לשיחה פרטית</p>
          </div>
        )}
      </div>
    </div>
  )

  // ─────────────────────────────────────────────────────────
  // WELCOME SCREEN
  // ─────────────────────────────────────────────────────────

  const welcomeScreen = (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center px-6" style={{ background: 'var(--bg)' }}>
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl" style={{ background: 'rgba(124,58,237,.08)', border: '2px solid rgba(124,58,237,.15)' }}>
        <MessageSquare size={36} className="text-purple-400" />
      </div>
      <div>
        <p className="text-lg font-bold" style={{ color: 'var(--tx)' }}>ברוך הבא לצ׳אטים</p>
        <p className="mt-1 text-sm" style={{ color: 'var(--tx3)' }}>בחר שיחה מהרשימה כדי להתחיל</p>
      </div>
    </div>
  )

  // ─────────────────────────────────────────────────────────
  // COMMUNITY CHAT
  // ─────────────────────────────────────────────────────────

  const communityChat = (
    <div className="flex h-full flex-col" style={{ background: 'var(--bg)' }}>
      <div className="shrink-0 flex items-center gap-3 px-4 py-3" style={{ background: 'var(--hdr)', borderBottom: '1px solid var(--bd)' }}>
        <button onClick={() => setMobileShowChat(false)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition hover:bg-slate-100 lg:hidden" style={{ color: 'var(--tx3)' }}>
          <ArrowRight size={17} />
        </button>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: 'rgba(124,58,237,.1)', border: '1px solid rgba(124,58,237,.2)' }}>
          <Users size={16} className="text-purple-600" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-bold" style={{ color: 'var(--tx)' }}>צ׳אט מרכזי</h2>
          <p className="text-[11px]" style={{ color: 'var(--tx3)' }}>צ׳אט כללי לכל חברי הקהילה</p>
        </div>
        <button onClick={toggleMute} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition hover:bg-slate-100" style={{ color: isMuted ? '#ef4444' : 'var(--tx3)' }} title={isMuted ? 'בטל השתקה' : 'השתק צלילים'}>
          {isMuted ? <BellOff size={15} /> : <Bell size={15} />}
        </button>
      </div>

      <div ref={communityScrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-0.5" onClick={() => setCommunityEmojiPickerFor(null)}>
        {communityMsgs.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <MessageSquare size={28} className="text-slate-300" />
            <p className="text-sm" style={{ color: 'var(--tx3)' }}>היה הראשון לכתוב בחדר הקהילה</p>
          </div>
        )}
        {communityMsgs.map((msg, i) => {
          const isOwn = msg.user_id === currentUserId
          const prev = communityMsgs[i - 1]
          const sameUser = prev?.user_id === msg.user_id
          const isTemp = String(msg.id).startsWith('temp-')
          const name = dName(msg.profiles)
          const isEditing = communityEditingId === msg.id
          const reactions = communityReactionsMap[msg.id] ?? []
          const showEmojiPicker = communityEmojiPickerFor === msg.id
          return (
            <div key={msg.id}>
              {needsDateSep(msg.created_at, prev?.created_at) && <DateSepLine iso={msg.created_at} />}
              <div className={`group flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : ''} ${sameUser ? 'mt-0.5' : 'mt-3'}`}>
                {!sameUser
                  ? <AvatarBubble profile={msg.profiles} uid={msg.user_id} size={8} />
                  : <div className="w-8 shrink-0" />
                }
                <div className={`flex max-w-[75%] flex-col gap-0.5 ${isOwn ? 'items-end' : 'items-start'}`}>
                  {!sameUser && (
                    <div className={`flex items-center gap-2 px-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
                      <span className="text-xs font-semibold" style={{ color: 'var(--tx2)' }}>{isOwn ? 'אתה' : name}</span>
                      <span className="text-[10px]" style={{ color: 'var(--tx3)' }}>{fmtTime(msg.created_at)}</span>
                    </div>
                  )}

                  {/* Edit mode */}
                  {isEditing ? (
                    <div className="flex flex-col gap-2" style={{ minWidth: '220px' }}>
                      <textarea
                        autoFocus
                        value={communityEditText}
                        onChange={e => setCommunityEditText(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCommunityEditSave(msg.id) }
                          if (e.key === 'Escape') { setCommunityEditingId(null); setCommunityEditText('') }
                        }}
                        className="rounded-xl px-3 py-2 text-sm leading-relaxed outline-none resize-none"
                        style={{ background: 'var(--inp)', border: '2px solid #7c3aed', color: 'var(--tx)' }}
                        rows={2}
                      />
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => { setCommunityEditingId(null); setCommunityEditText('') }} className="rounded-lg px-2.5 py-1 text-xs font-medium" style={{ background: 'var(--inp)', color: 'var(--tx3)', border: '1px solid var(--bd)' }}>ביטול</button>
                        <button onClick={() => handleCommunityEditSave(msg.id)} className="rounded-lg px-2.5 py-1 text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>שמור</button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`rounded-2xl text-sm leading-relaxed ${isTemp ? 'opacity-70' : ''}`}
                      style={isOwn
                        ? { background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: 'white', padding: '8px 14px' }
                        : { background: 'var(--s2)', border: '1px solid var(--bd)', color: 'var(--tx)', padding: '8px 14px' }
                      }
                    >
                      {/* Reply quote */}
                      {msg.reply_to_id && msg.reply_to && 'id' in msg.reply_to && (
                        <div className="mb-2 rounded-lg px-2.5 py-1.5 text-xs border-s-2 border-purple-400" style={{ background: isOwn ? 'rgba(255,255,255,.15)' : 'var(--inp)' }}>
                          <p className="font-semibold mb-0.5" style={{ color: isOwn ? 'rgba(255,255,255,.9)' : '#7c3aed' }}>
                            {msg.reply_to.user_id === currentUserId ? 'אתה' : dName(communityMsgs.find(m => m.id === msg.reply_to?.id)?.profiles)}
                          </p>
                          <p className="truncate opacity-80">{msg.reply_to.content ?? '📎 קובץ'}</p>
                        </div>
                      )}
                      {/* Attachment */}
                      {msg.attachment_url && (
                        <div className="mb-1">
                          {msg.attachment_type === 'image' && (
                            <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer">
                              <img src={msg.attachment_url} alt="" className="max-h-48 max-w-[220px] rounded-xl object-cover cursor-pointer hover:opacity-90 transition" />
                            </a>
                          )}
                          {msg.attachment_type === 'images' && (() => {
                            let urls: string[] = []
                            try { urls = JSON.parse(msg.attachment_url!) } catch { urls = [msg.attachment_url!] }
                            return (
                              <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', maxWidth: '260px' }}>
                                {urls.map((url, i) => (
                                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                    <img src={url} alt="" className="w-full rounded-lg cursor-pointer hover:opacity-90 transition" style={{ aspectRatio: '1', objectFit: 'cover' }} />
                                  </a>
                                ))}
                              </div>
                            )
                          })()}
                          {msg.attachment_type !== 'image' && msg.attachment_type !== 'images' && (
                            <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition hover:opacity-80" style={{ background: isOwn ? 'rgba(255,255,255,.15)' : 'var(--inp)', border: '1px solid var(--bd)' }}>
                              <FileIcon size={16} />
                              <span className="truncate text-xs">{msg.attachment_name ?? 'קובץ'}</span>
                            </a>
                          )}
                        </div>
                      )}
                      {msg.content && <span className="whitespace-pre-wrap">{renderContent(msg.content)}</span>}
                      {msg.edited_at && <span className="ms-1.5 text-[10px] opacity-60 italic">נערך</span>}
                    </div>
                  )}

                  {/* Reactions row */}
                  {reactions.length > 0 && !isEditing && (
                    <div className={`flex flex-wrap gap-1 px-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      {reactions.map(r => (
                        <button key={r.emoji} onClick={e => { e.stopPropagation(); handleCommunityReaction(msg.id, r.emoji) }}
                          className="flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs transition hover:scale-105"
                          style={{ background: r.hasReacted ? 'rgba(124,58,237,.15)' : 'var(--inp)', border: r.hasReacted ? '1px solid rgba(124,58,237,.4)' : '1px solid var(--bd)' }}>
                          <span>{r.emoji}</span>
                          <span className="text-[10px] font-medium" style={{ color: r.hasReacted ? '#7c3aed' : 'var(--tx3)' }}>{r.count}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Time + hover actions */}
                  {!isEditing && (
                    <div className={`relative flex items-center gap-1 px-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
                      {sameUser && <span className="text-[10px]" style={{ color: 'var(--tx3)' }}>{fmtTime(msg.created_at)}</span>}
                      {isOwn && isTemp && <span className="text-[10px]" style={{ color: 'var(--tx3)' }}>שולח...</span>}
                      {!isTemp && (
                        <div className={`flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100 ${isOwn ? 'flex-row-reverse' : ''}`}>
                          <div className="relative">
                            <button onClick={e => { e.stopPropagation(); setCommunityEmojiPickerFor(showEmojiPicker ? null : msg.id) }}
                              className="rounded p-1 transition hover:bg-purple-500/10" style={{ color: showEmojiPicker ? '#7c3aed' : 'var(--tx3)' }} title="תגובת אימוג׳י">
                              <Smile size={11} />
                            </button>
                            {showEmojiPicker && (
                              <div className={`absolute z-20 ${isOwn ? 'end-0' : 'start-0'}`} style={{ bottom: '24px' }} onClick={e => e.stopPropagation()}>
                                <EmojiPickerRow onSelect={e => handleCommunityReaction(msg.id, e)} />
                              </div>
                            )}
                          </div>
                          <button onClick={e => { e.stopPropagation(); setCommunityReplyTo(msg) }}
                            className="rounded p-1 transition hover:bg-blue-500/10" style={{ color: 'var(--tx3)' }} title="הגב">
                            <CornerUpLeft size={11} />
                          </button>
                          {isOwn && msg.content && (
                            <button onClick={e => { e.stopPropagation(); setCommunityEditingId(msg.id); setCommunityEditText(msg.content ?? '') }}
                              className="rounded p-1 transition hover:bg-amber-500/10" style={{ color: 'var(--tx3)' }} title="ערוך">
                              <Edit2 size={11} />
                            </button>
                          )}
                          {(isOwn || isAdmin) && (
                            <button onClick={e => { e.stopPropagation(); handleDeleteCommunity(msg.id) }}
                              className="rounded p-1 transition hover:bg-red-500/10 hover:text-red-500" style={{ color: 'var(--tx3)' }}>
                              <Trash2 size={11} />
                            </button>
                          )}
                          {!isOwn && (
                            <ReportButton contentType="message" contentId={msg.id} />
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={communityBottomRef} />
      </div>

      <InputBar
        value={communityText}
        onChange={(v) => { setCommunityText(v); setMentionQuery(getMentionQuery(v)) }}
        onKeyDown={handleCommunityKey}
        onSend={handleCommunitySend}
        isSending={isSendingC}
        textRef={communityTextRef}
        onAttachClick={() => fileInputRef.current?.click()}
        attachments={attachFiles.map((f, i) => ({ name: f.name, type: f.type, preview: attachPreviews[i] || undefined }))}
        onRemoveAttachment={removeAttach}
        onImagePaste={addAttachFile}
        isUploading={isUploading}
        replyTo={communityReplyTo ? {
          content: communityReplyTo.content,
          senderName: communityReplyTo.user_id === currentUserId ? 'אתה' : dName(communityReplyTo.profiles),
        } : null}
        onCancelReply={() => setCommunityReplyTo(null)}
        mentionUsers={activeSide === 'community' ? mentionedUsers : []}
        onMentionSelect={handleMentionSelect}
      />
    </div>
  )

  // ─────────────────────────────────────────────────────────
  // PRIVATE CHAT
  // ─────────────────────────────────────────────────────────

  const privateChat = selectedPartner && (
    <div className="flex h-full flex-col" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3" style={{ background: 'var(--hdr)', borderBottom: '1px solid var(--bd)' }}>
        <button onClick={() => { setSelectedPartner(null); setMobileShowChat(false) }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition hover:bg-slate-100 lg:hidden" style={{ color: 'var(--tx3)' }}>
          <ArrowRight size={17} />
        </button>
        <AvatarBubble profile={partnerProfile} uid={selectedPartner} size={10} online={onlineUsers.has(selectedPartner)} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-bold" style={{ color: 'var(--tx)' }}>{dName(partnerProfile)}</h2>
          <p className="text-[11px]" style={{ color: onlineUsers.has(selectedPartner) ? '#059669' : 'var(--tx3)' }}>
            {onlineUsers.has(selectedPartner) ? 'מקוון' : partnerProfile?.specialization ?? ''}
          </p>
        </div>
        <button onClick={() => setShowPrivateSearch(s => !s)} className="flex h-8 w-8 items-center justify-center rounded-xl transition hover:bg-slate-100" style={{ color: showPrivateSearch ? '#7c3aed' : 'var(--tx3)' }}>
          <Search size={15} />
        </button>
        <button onClick={toggleMute} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition hover:bg-slate-100" style={{ color: isMuted ? '#ef4444' : 'var(--tx3)' }} title={isMuted ? 'בטל השתקה' : 'השתק צלילים'}>
          {isMuted ? <BellOff size={15} /> : <Bell size={15} />}
        </button>
        <Lock size={14} style={{ color: 'var(--tx3)' }} className="shrink-0" />
      </div>

      {/* Search bar */}
      {showPrivateSearch && (
        <div className="shrink-0 flex items-center gap-2 px-4 py-2" style={{ background: 'var(--inp)', borderBottom: '1px solid var(--bd)' }}>
          <Search size={14} style={{ color: 'var(--tx3)' }} />
          <input autoFocus value={privateSearch} onChange={e => setPrivateSearch(e.target.value)} placeholder="חפש בשיחה..." className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400" style={{ color: 'var(--tx)' }} />
          {privateSearch && <button onClick={() => setPrivateSearch('')} style={{ color: 'var(--tx3)' }}><X size={13} /></button>}
          <button onClick={() => { setShowPrivateSearch(false); setPrivateSearch('') }} className="text-xs text-purple-600 font-medium">סגור</button>
        </div>
      )}

      {/* Pinned message */}
      {pinnedMsg && (
        <div className="shrink-0 flex items-center gap-2.5 px-4 py-2" style={{ background: 'rgba(124,58,237,.06)', borderBottom: '1px solid rgba(124,58,237,.15)' }}>
          <Pin size={13} className="shrink-0 text-purple-500" />
          <p className="flex-1 truncate text-xs" style={{ color: 'var(--tx2)' }}>
            {pinnedMsg.deleted_for_all ? 'הודעה נמחקה' : pinnedMsg.content ?? (pinnedMsg.attachment_type === 'image' ? '📷 תמונה' : '📎 קובץ')}
          </p>
          <button onClick={() => setPinnedMsgId(null)} style={{ color: 'var(--tx3)' }}><X size={13} /></button>
        </div>
      )}

      {/* Messages */}
      <div
        ref={privateScrollRef}
        className="flex-1 overflow-y-auto px-4 py-3"
        onClick={() => setEmojiPickerFor(null)}
      >
        {currentConvMsgs.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <Lock size={28} className="text-slate-300" />
            <p className="text-sm" style={{ color: 'var(--tx3)' }}>שלח הודעה ראשונה לפתוח את השיחה</p>
          </div>
        )}

        {currentConvMsgs.map((msg, i) => {
          const isOwn = msg.sender_id === currentUserId
          const prev = currentConvMsgs[i - 1]
          const sameUser = prev?.sender_id === msg.sender_id
          const isTemp = String(msg.id).startsWith('temp-')
          const isDeleted = !!msg.deleted_for_all
          const isPinned = pinnedMsgId === msg.id
          const isEditing = editingMsgId === msg.id
          const reactions = reactionsMap[msg.id] ?? []
          const showEmojiPicker = emojiPickerFor === msg.id

          return (
            <div key={msg.id}>
              {needsDateSep(msg.created_at, prev?.created_at) && <DateSepLine iso={msg.created_at} />}
              <div className={`group flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : ''} ${sameUser ? 'mt-0.5' : 'mt-3'}`}>
                {!sameUser
                  ? <AvatarBubble profile={isOwn ? currentProfile : partnerProfile} uid={msg.sender_id} size={8} />
                  : <div className="w-8 shrink-0" />
                }

                <div className={`flex max-w-[75%] flex-col gap-0.5 ${isOwn ? 'items-end' : 'items-start'}`}>
                  {!sameUser && (
                    <div className={`flex items-center gap-2 px-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
                      <span className="text-xs font-semibold" style={{ color: 'var(--tx2)' }}>{isOwn ? 'אתה' : dName(partnerProfile)}</span>
                      <span className="text-[10px]" style={{ color: 'var(--tx3)' }}>{fmtTime(msg.created_at)}</span>
                    </div>
                  )}

                  {/* Edit mode */}
                  {isEditing ? (
                    <div className="flex flex-col gap-2" style={{ minWidth: '220px' }}>
                      <textarea
                        autoFocus
                        value={editingText}
                        onChange={e => setEditingText(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditSave() }
                          if (e.key === 'Escape') { setEditingMsgId(null); setEditingText('') }
                        }}
                        className="rounded-xl px-3 py-2 text-sm leading-relaxed outline-none resize-none"
                        style={{ background: 'var(--inp)', border: '2px solid #7c3aed', color: 'var(--tx)' }}
                        rows={2}
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => { setEditingMsgId(null); setEditingText('') }}
                          className="rounded-lg px-2.5 py-1 text-xs font-medium"
                          style={{ background: 'var(--inp)', color: 'var(--tx3)', border: '1px solid var(--bd)' }}
                        >ביטול</button>
                        <button
                          onClick={handleEditSave}
                          className="rounded-lg px-2.5 py-1 text-xs font-bold text-white"
                          style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}
                        >שמור</button>
                      </div>
                    </div>
                  ) : (
                    /* Normal bubble */
                    <div
                      className={`rounded-2xl text-sm leading-relaxed ${isTemp ? 'opacity-70' : ''} ${isPinned ? 'ring-2 ring-purple-400' : ''}`}
                      style={isOwn
                        ? { background: isDeleted ? 'var(--inp)' : 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: isDeleted ? 'var(--tx3)' : 'white', padding: '8px 14px' }
                        : { background: isDeleted ? 'var(--inp)' : 'var(--s2)', border: '1px solid var(--bd)', color: isDeleted ? 'var(--tx3)' : 'var(--tx)', padding: '8px 14px' }
                      }
                    >
                      {isDeleted ? (
                        <span style={{ fontStyle: 'italic' }}>🚫 הודעה נמחקה</span>
                      ) : (
                        <>
                          {/* Reply quote — only when reply_to_id is set AND join returned a real row */}
                          {msg.reply_to_id && msg.reply_to && 'id' in msg.reply_to && (
                            <div
                              className="mb-2 rounded-lg px-2.5 py-1.5 text-xs border-s-2 border-purple-400"
                              style={{ background: isOwn ? 'rgba(255,255,255,.15)' : 'var(--inp)' }}
                            >
                              <p className="font-semibold mb-0.5" style={{ color: isOwn ? 'rgba(255,255,255,.9)' : '#7c3aed' }}>
                                {msg.reply_to.sender_id === currentUserId ? 'אתה' : dName(partnerProfile)}
                              </p>
                              <p className="truncate opacity-80">{msg.reply_to.content ?? '📎 קובץ'}</p>
                            </div>
                          )}
                          {/* Attachment */}
                          {msg.attachment_url && (
                            <div className="mb-1">
                              {msg.attachment_type === 'image' && (
                                <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer">
                                  <img src={msg.attachment_url} alt="" className="max-h-48 max-w-[220px] rounded-xl object-cover cursor-pointer hover:opacity-90 transition" />
                                </a>
                              )}
                              {msg.attachment_type === 'images' && (() => {
                                let urls: string[] = []
                                try { urls = JSON.parse(msg.attachment_url!) } catch { urls = [msg.attachment_url!] }
                                return (
                                  <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', maxWidth: '260px' }}>
                                    {urls.map((url, i) => (
                                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                        <img src={url} alt="" className="w-full rounded-lg cursor-pointer hover:opacity-90 transition" style={{ aspectRatio: '1', objectFit: 'cover' }} />
                                      </a>
                                    ))}
                                  </div>
                                )
                              })()}
                              {msg.attachment_type !== 'image' && msg.attachment_type !== 'images' && (
                                <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition hover:opacity-80" style={{ background: isOwn ? 'rgba(255,255,255,.15)' : 'var(--inp)', border: '1px solid var(--bd)' }}>
                                  <FileIcon size={16} />
                                  <span className="truncate text-xs">{msg.attachment_name ?? 'קובץ'}</span>
                                </a>
                              )}
                            </div>
                          )}
                          {msg.content && <span className="whitespace-pre-wrap">{renderContent(msg.content)}</span>}
                          {msg.edited_at && (
                            <span className="ms-1.5 text-[10px] opacity-60 italic">נערך</span>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* Reactions row */}
                  {reactions.length > 0 && !isDeleted && !isEditing && (
                    <div className={`flex flex-wrap gap-1 px-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      {reactions.map(r => (
                        <button
                          key={r.emoji}
                          onClick={e => { e.stopPropagation(); handleReaction(msg.id, r.emoji) }}
                          className="flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs transition hover:scale-105"
                          style={{
                            background: r.hasReacted ? 'rgba(124,58,237,.15)' : 'var(--inp)',
                            border: r.hasReacted ? '1px solid rgba(124,58,237,.4)' : '1px solid var(--bd)',
                          }}
                        >
                          <span>{r.emoji}</span>
                          <span className="text-[10px] font-medium" style={{ color: r.hasReacted ? '#7c3aed' : 'var(--tx3)' }}>{r.count}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Status + hover actions */}
                  {!isEditing && (
                    <div className={`relative flex items-center gap-1 px-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
                      {sameUser && (
                        <span className="text-[10px]" style={{ color: 'var(--tx3)' }}>{fmtTime(msg.created_at)}</span>
                      )}
                      {isOwn && !isTemp && !isDeleted && (
                        msg.is_read
                          ? <CheckCheck size={12} className="text-purple-500" />
                          : <Check size={12} style={{ color: 'var(--tx3)' }} />
                      )}
                      {isOwn && isTemp && <span className="text-[10px]" style={{ color: 'var(--tx3)' }}>שולח...</span>}

                      {/* Hover actions */}
                      {!isDeleted && !isTemp && (
                        <div className={`flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100 ${isOwn ? 'flex-row-reverse' : ''}`}>

                          {/* Emoji picker */}
                          <div className="relative">
                            <button
                              onClick={e => { e.stopPropagation(); setEmojiPickerFor(showEmojiPicker ? null : msg.id) }}
                              className="rounded p-1 transition hover:bg-purple-500/10"
                              style={{ color: showEmojiPicker ? '#7c3aed' : 'var(--tx3)' }}
                              title="תגובת אימוג׳י"
                            >
                              <Smile size={11} />
                            </button>
                            {showEmojiPicker && (
                              <div
                                className={`absolute z-20 ${isOwn ? 'end-0' : 'start-0'}`}
                                style={{ bottom: '24px' }}
                                onClick={e => e.stopPropagation()}
                              >
                                <EmojiPickerRow onSelect={e => handleReaction(msg.id, e)} />
                              </div>
                            )}
                          </div>

                          {/* Reply */}
                          <button
                            onClick={e => { e.stopPropagation(); setReplyTo(msg) }}
                            className="rounded p-1 transition hover:bg-blue-500/10"
                            style={{ color: 'var(--tx3)' }}
                            title="הגב"
                          >
                            <CornerUpLeft size={11} />
                          </button>

                          {/* Edit (own only, has text) */}
                          {isOwn && msg.content && (
                            <button
                              onClick={e => { e.stopPropagation(); setEditingMsgId(msg.id); setEditingText(msg.content ?? '') }}
                              className="rounded p-1 transition hover:bg-amber-500/10"
                              style={{ color: 'var(--tx3)' }}
                              title="ערוך"
                            >
                              <Edit2 size={11} />
                            </button>
                          )}

                          {/* Pin */}
                          <button
                            onClick={e => { e.stopPropagation(); setPinnedMsgId(pinnedMsgId === msg.id ? null : msg.id) }}
                            className="rounded p-1 transition hover:bg-purple-500/10"
                            title={isPinned ? 'הסר הצמדה' : 'הצמד'}
                            style={{ color: isPinned ? '#7c3aed' : 'var(--tx3)' }}
                          >
                            <Pin size={11} />
                          </button>

                          {/* Delete (own only) */}
                          {isOwn && (
                            <button
                              onClick={e => { e.stopPropagation(); handleDeletePrivate(msg.id) }}
                              className="rounded p-1 transition hover:bg-red-500/10 hover:text-red-500"
                              style={{ color: 'var(--tx3)' }}
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                          {!isOwn && (
                            <ReportButton contentType="private_message" contentId={msg.id} />
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {/* Typing indicator */}
        {partnerTyping && (
          <div className="mt-3 flex items-end gap-2">
            <AvatarBubble profile={partnerProfile} uid={selectedPartner} size={8} />
            <div className="rounded-2xl px-4 py-2.5" style={{ background: 'var(--s2)', border: '1px solid var(--bd)' }}>
              <TypingDots />
            </div>
          </div>
        )}

        <div ref={privateBottomRef} />
      </div>

      <InputBar
        value={privateText}
        onChange={(v) => { setPrivateText(v); broadcastTyping(); setMentionQuery(getMentionQuery(v)) }}
        onKeyDown={handlePrivateKey}
        onSend={handlePrivateSend}
        isSending={isSendingP}
        textRef={privateTextRef}
        onAttachClick={() => fileInputRef.current?.click()}
        attachments={attachFiles.map((f, i) => ({ name: f.name, type: f.type, preview: attachPreviews[i] || undefined }))}
        onRemoveAttachment={removeAttach}
        onImagePaste={addAttachFile}
        isUploading={isUploading}
        replyTo={replyTo ? {
          content: replyTo.content,
          senderName: replyTo.sender_id === currentUserId ? 'אתה' : dName(partnerProfile),
        } : null}
        onCancelReply={() => setReplyTo(null)}
        mentionUsers={activeSide === 'private' ? mentionedUsers : []}
        onMentionSelect={handleMentionSelect}
      />
    </div>
  )

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────

  const rightContent = activeSide === 'community'
    ? communityChat
    : (selectedPartner ? privateChat : welcomeScreen)

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden lg:h-screen">
      <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar" multiple className="hidden" onChange={handleFileSelect} />
      <div
        className={`${mobileShowChat ? 'hidden' : 'flex'} lg:flex w-full flex-col lg:w-80 xl:w-96 shrink-0`}
        style={{ borderInlineEnd: '1px solid var(--bd)' }}
      >
        {leftPanel}
      </div>
      <div className={`${mobileShowChat ? 'flex' : 'hidden'} lg:flex flex-1 flex-col overflow-hidden`}>
        {rightContent}
      </div>
    </div>
  )
}

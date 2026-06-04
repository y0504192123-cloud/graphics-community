'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

type NotifItem = {
  id: string
  senderName: string
  senderAvatar: string | null
  senderId: string
  preview: string
  source: 'chat' | 'forum'
  link: string
  at: number
}

function Avatar({ name, url, size = 40 }: { name: string; url: string | null; size?: number }) {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div
      className="shrink-0 flex items-center justify-center rounded-full font-bold overflow-hidden"
      style={{ width: size, height: size, background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white', fontSize: size * 0.35 }}
    >
      {url ? <img src={url} alt={name} style={{ width: size, height: size, objectFit: 'cover' }} /> : initials}
    </div>
  )
}

export default function FloatingNotifications({ currentUserId }: { currentUserId: string }) {
  const router = useRouter()
  const [notifs, setNotifs] = useState<NotifItem[]>([])
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const supabase = useMemo(() => createClient(), [])

  const addNotif = (item: NotifItem) => {
    setNotifs(prev => {
      if (prev.some(n => n.id === item.id)) return prev
      return [item, ...prev].slice(0, 3)
    })
    timersRef.current[item.id] = setTimeout(() => dismiss(item.id), 10000)
  }

  const dismiss = (id: string) => {
    clearTimeout(timersRef.current[id])
    delete timersRef.current[id]
    setNotifs(prev => prev.filter(n => n.id !== id))
    setHoveredId(h => h === id ? null : h)
  }

  useEffect(() => {
    // Private messages
    const pmCh = supabase.channel(`float-pm-${currentUserId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'private_messages' }, async (payload) => {
        const m = payload.new as { id: string; sender_id: string; receiver_id: string; content: string; created_at: string }
        if (m.receiver_id !== currentUserId) return
        const { data: prof } = await supabase.from('profiles').select('id,full_name,username,avatar_url').eq('id', m.sender_id).single()
        const p = prof as Profile | null
        const name = p?.full_name ?? p?.username ?? 'משתמש'
        addNotif({
          id: `pm-${m.id}`,
          senderName: name,
          senderAvatar: p?.avatar_url ?? null,
          senderId: m.sender_id,
          preview: m.content.slice(0, 60),
          source: 'chat',
          link: `/chat?dm=${m.sender_id}`,
          at: Date.now(),
        })
      })
      .subscribe()

    // Forum notifications
    const forumCh = supabase.channel(`float-forum-${currentUserId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUserId}` }, async (payload) => {
        const n = payload.new as { id: string; type: string; content: string; link: string | null; created_at: string; user_id: string }
        if (n.type !== 'forum_reply') return
        addNotif({
          id: `forum-${n.id}`,
          senderName: 'פורום',
          senderAvatar: null,
          senderId: '',
          preview: n.content,
          source: 'forum',
          link: n.link ?? '/forum',
          at: Date.now(),
        })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(pmCh)
      supabase.removeChannel(forumCh)
      Object.values(timersRef.current).forEach(clearTimeout)
    }
  }, [currentUserId, supabase])

  if (notifs.length === 0) return null

  return (
    <div className="fixed bottom-5 start-5 z-50 flex flex-col-reverse gap-2" style={{ pointerEvents: 'none' }}>
      {notifs.map((n) => {
        const expanded = hoveredId === n.id
        return (
          <div
            key={n.id}
            style={{ pointerEvents: 'auto' }}
            onMouseEnter={() => {
              setHoveredId(n.id)
              clearTimeout(timersRef.current[n.id])
            }}
            onMouseLeave={() => {
              setHoveredId(null)
              timersRef.current[n.id] = setTimeout(() => dismiss(n.id), 2000)
            }}
          >
            <div
              className="flex items-center gap-2.5 cursor-pointer select-none transition-all duration-300 rounded-2xl shadow-lg"
              style={{
                background: 'var(--s1)',
                border: '1px solid var(--bd)',
                padding: expanded ? '10px 14px' : '6px',
                maxWidth: expanded ? '280px' : '52px',
                overflow: 'hidden',
                backdropFilter: 'blur(12px)',
              }}
              onClick={() => { dismiss(n.id); router.push(n.link) }}
            >
              <Avatar name={n.senderName} url={n.senderAvatar} size={38} />
              {expanded && (
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <p className="truncate text-xs font-semibold" style={{ color: 'var(--tx)' }}>{n.senderName}</p>
                    <span
                      className="shrink-0 rounded-full px-1.5 py-px text-[9px] font-bold"
                      style={{
                        background: n.source === 'chat' ? 'rgba(59,130,246,.12)' : 'rgba(124,58,237,.12)',
                        color: n.source === 'chat' ? '#3b82f6' : '#7c3aed',
                      }}
                    >
                      {n.source === 'chat' ? "צ'אט" : 'פורום'}
                    </span>
                  </div>
                  <p className="truncate text-[11px]" style={{ color: 'var(--tx3)' }}>{n.preview}</p>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

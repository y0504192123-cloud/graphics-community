'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { playPing } from '@/lib/sound'
import type { Profile } from '@/types'

type NotifItem = {
  id: string
  senderName: string
  senderAvatar: string | null
  preview: string
  source: 'chat' | 'forum'
  link: string
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div
      className="shrink-0 flex items-center justify-center rounded-full font-bold overflow-hidden"
      style={{ width: 36, height: 36, background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white', fontSize: 13 }}
    >
      {url
        ? <img src={url} alt={name} style={{ width: 36, height: 36, objectFit: 'cover' }} />
        : initials
      }
    </div>
  )
}

export default function FloatingNotifications({ currentUserId }: { currentUserId: string }) {
  const router = useRouter()
  const [notifs, setNotifs] = useState<NotifItem[]>([])
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const supabase = useMemo(() => createClient(), [])

  const dismiss = useCallback((id: string) => {
    setNotifs(prev => prev.filter(n => n.id !== id))
    clearTimeout(timersRef.current[id])
    delete timersRef.current[id]
  }, [])

  const addNotif = useCallback((item: NotifItem) => {
    setNotifs(prev => {
      if (prev.some(n => n.id === item.id)) return prev
      return [item, ...prev].slice(0, 3)
    })
    playPing()
    timersRef.current[item.id] = setTimeout(() => {
      setNotifs(prev => prev.filter(n => n.id !== item.id))
      delete timersRef.current[item.id]
    }, 10000)
  }, [])

  useEffect(() => {
    console.log('[FloatingNotifications] mounted, userId:', currentUserId)

    // Private messages — rely on RLS for delivery, filter receiver client-side
    const pmCh = supabase.channel(`float-pm-${currentUserId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'private_messages' },
        async (payload) => {
          console.log('[FloatingNotif] PM INSERT raw event:', payload.new)
          const m = payload.new as { id: string; sender_id: string; receiver_id: string; content: string | null }
          if (!m?.id) return
          // Only show notification for messages received by current user
          if (m.receiver_id !== currentUserId) return

          // Suppress if already viewing this exact DM conversation
          const path = window.location.pathname + window.location.search
          if (path.includes('/chat') && path.includes(m.sender_id)) return

          const { data: prof } = await supabase
            .from('profiles')
            .select('id,full_name,username,avatar_url')
            .eq('id', m.sender_id)
            .single()
          const p = prof as Profile | null
          const name = p?.full_name ?? p?.username ?? 'משתמש'
          addNotif({
            id: `pm-${m.id}`,
            senderName: name,
            senderAvatar: p?.avatar_url ?? null,
            preview: m.content?.slice(0, 70) ?? '📎 קובץ',
            source: 'chat',
            link: `/chat?dm=${m.sender_id}`,
          })
        }
      )
      .subscribe((status, err) => {
        console.log('[FloatingNotif] PM channel status:', status, err ?? '')
      })

    // Forum notifications — rely on RLS, filter client-side
    const forumCh = supabase.channel(`float-forum-${currentUserId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          console.log('[FloatingNotif] notification INSERT raw event:', payload.new)
          const n = payload.new as { id: string; user_id: string; type: string; content: string; link: string | null }
          if (!n?.id) return
          if (n.user_id !== currentUserId) return
          if (n.type !== 'forum_reply') return
          addNotif({
            id: `forum-${n.id}`,
            senderName: 'פורום',
            senderAvatar: null,
            preview: n.content,
            source: 'forum',
            link: n.link ?? '/forum',
          })
        }
      )
      .subscribe((status, err) => {
        console.log('[FloatingNotif] Forum channel status:', status, err ?? '')
      })

    return () => {
      supabase.removeChannel(pmCh)
      supabase.removeChannel(forumCh)
      Object.values(timersRef.current).forEach(clearTimeout)
    }
  }, [currentUserId, supabase, addNotif])

  if (notifs.length === 0) return null

  return (
    <div className="fixed z-[200] flex flex-col-reverse gap-2" style={{ bottom: 20, left: 20 }}>
      {notifs.map((n) => (
        <div
          key={n.id}
          className="flex items-center gap-3 cursor-pointer select-none rounded-2xl shadow-xl"
          style={{
            background: 'var(--s1)',
            border: '1px solid var(--bd)',
            padding: '10px 14px',
            width: '280px',
            backdropFilter: 'blur(12px)',
          }}
          onClick={() => { dismiss(n.id); router.push(n.link) }}
        >
          <Avatar name={n.senderName} url={n.senderAvatar} />
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
          <button
            onClick={e => { e.stopPropagation(); dismiss(n.id) }}
            className="shrink-0 rounded-full p-0.5 transition hover:bg-slate-100"
            style={{ color: 'var(--tx3)' }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}

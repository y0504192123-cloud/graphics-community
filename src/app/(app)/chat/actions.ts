'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ── internal helper: create mention notifications ─────────

async function createMentionNotifications(
  admin: ReturnType<typeof createAdminClient>,
  content: string,
  senderName: string,
  senderId: string,
  link: string,
) {
  const matches = content.match(/@([^\s@]+)/g)
  if (!matches?.length) return
  const names = matches.map(m => m.slice(1).toLowerCase())
  const { data: users } = await admin
    .from('profiles')
    .select('id, full_name, username')
    .eq('status', 'active')
  if (!users?.length) return
  for (const name of names) {
    const hit = users.find(u =>
      u.username?.toLowerCase() === name ||
      u.full_name?.split(' ')[0]?.toLowerCase() === name ||
      u.full_name?.toLowerCase().replace(/\s+/g, '') === name,
    )
    if (hit && hit.id !== senderId) {
      await admin.from('notifications').insert({
        user_id: hit.id,
        type: 'mention',
        content: `${senderName} תייג אותך: "${content.slice(0, 80)}"`,
        link,
      })
    }
  }
}

// ── Community messages ────────────────────────────────────

export async function sendMessage(
  topicId: string,
  content: string,
  attachmentUrl?: string,
  attachmentType?: string,
  attachmentName?: string,
  replyToId?: string,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const admin = createAdminClient()
  await admin.from('messages').insert({
    channel_id: topicId,
    user_id: user.id,
    content: content || null,
    attachment_url: attachmentUrl ?? null,
    attachment_type: attachmentType ?? null,
    attachment_name: attachmentName ?? null,
    reply_to_id: replyToId ?? null,
  })
  if (content) {
    const { data: prof } = await admin.from('profiles').select('full_name, username').eq('id', user.id).single()
    const senderName = prof?.full_name ?? prof?.username ?? 'משתמש'
    await createMentionNotifications(admin, content, senderName, user.id, '/chat')
  }
}

export async function editMessage(messageId: string, content: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const admin = createAdminClient()
  const { data: msg } = await admin.from('messages').select('user_id').eq('id', messageId).single()
  if (!msg || msg.user_id !== user.id) return
  await admin.from('messages').update({ content, edited_at: new Date().toISOString() }).eq('id', messageId)
}

export async function deleteMessage(messageId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const admin = createAdminClient()
  const { data: msg } = await admin.from('messages').select('user_id').eq('id', messageId).single()
  if (!msg) return
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (msg.user_id !== user.id && profile?.role !== 'admin') return
  await admin.from('messages').delete().eq('id', messageId)
}

export async function toggleCommunityReaction(messageId: string, emoji: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const admin = createAdminClient()
  const { data: existing } = await admin
    .from('community_reactions')
    .select('id, emoji').eq('message_id', messageId).eq('user_id', user.id).maybeSingle()
  if (existing) {
    if (existing.emoji === emoji) {
      await admin.from('community_reactions').delete().eq('id', existing.id)
    } else {
      await admin.from('community_reactions').update({ emoji }).eq('id', existing.id)
    }
  } else {
    await admin.from('community_reactions').insert({ message_id: messageId, user_id: user.id, emoji })
  }
}

// ── Private messages ──────────────────────────────────────

export async function sendPrivateMessage(
  receiverId: string,
  content: string,
  attachmentUrl?: string,
  attachmentType?: string,
  attachmentName?: string,
  replyToId?: string,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const admin = createAdminClient()
  await admin.from('private_messages').insert({
    sender_id: user.id,
    receiver_id: receiverId,
    content: content || null,
    job_id: null,
    is_read: false,
    attachment_url: attachmentUrl ?? null,
    attachment_type: attachmentType ?? null,
    attachment_name: attachmentName ?? null,
    reply_to_id: replyToId ?? null,
  })
  if (content) {
    const { data: prof } = await admin.from('profiles').select('full_name, username').eq('id', user.id).single()
    const senderName = prof?.full_name ?? prof?.username ?? 'משתמש'
    await createMentionNotifications(admin, content, senderName, user.id, '/chat')
  }
}

export async function deletePrivateMessage(messageId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'לא מחובר' }
  const admin = createAdminClient()
  const { data: msg } = await admin.from('private_messages').select('sender_id').eq('id', messageId).single()
  if (!msg) return { error: 'הודעה לא נמצאה' }
  if (msg.sender_id !== user.id) return { error: 'אין הרשאה' }
  const { error } = await admin.from('private_messages')
    .update({ deleted_for_all: true, content: null })
    .eq('id', messageId)
  if (error) return { error: 'שגיאה במחיקת ההודעה' }
  return {}
}

export async function markMessagesRead(senderId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await createAdminClient()
    .from('private_messages')
    .update({ is_read: true })
    .eq('sender_id', senderId)
    .eq('receiver_id', user.id)
    .eq('is_read', false)
}

export async function editPrivateMessage(messageId: string, content: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'לא מחובר' }
  const admin = createAdminClient()
  const { data: msg } = await admin.from('private_messages').select('sender_id').eq('id', messageId).single()
  if (!msg || msg.sender_id !== user.id) return { error: 'אין הרשאה' }
  const { error } = await admin.from('private_messages').update({ content, edited_at: new Date().toISOString() }).eq('id', messageId)
  if (error) return { error: 'שגיאה בעריכת ההודעה' }
  return {}
}

export async function toggleReaction(messageId: string, emoji: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const admin = createAdminClient()
  const { data: existing } = await admin.from('message_reactions')
    .select('id, emoji').eq('message_id', messageId).eq('user_id', user.id).maybeSingle()
  if (existing) {
    if (existing.emoji === emoji) {
      await admin.from('message_reactions').delete().eq('id', existing.id)
    } else {
      await admin.from('message_reactions').update({ emoji }).eq('id', existing.id)
    }
  } else {
    await admin.from('message_reactions').insert({ message_id: messageId, user_id: user.id, emoji })
  }
}

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/avif',
  'application/pdf',
  'video/mp4', 'video/quicktime', 'video/webm',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

export async function getChatUploadUrl(mimeType?: string): Promise<{ signedUrl?: string; publicUrl?: string; error?: string }> {
  if (mimeType && !ALLOWED_MIME_TYPES.has(mimeType) && !mimeType.startsWith('image/')) {
    return { error: `סוג הקובץ "${mimeType}" אינו נתמך` }
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'לא מחובר' }
  const admin = createAdminClient()
  const path = `${user.id}/${Date.now()}`
  const { data, error } = await admin.storage.from('chat-attachments').createSignedUploadUrl(path)
  if (error) return { error: error.message }
  const { data: { publicUrl } } = admin.storage.from('chat-attachments').getPublicUrl(path)
  return { signedUrl: data.signedUrl, publicUrl }
}

// kept for compatibility (still used in admin panel but not in ChatClient)
export async function createTopic(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  await supabase.from('topics').insert({
    title: formData.get('title') as string,
    category: formData.get('category') as string || 'כללי',
    created_by: user.id,
  })
  revalidatePath('/chat')
}

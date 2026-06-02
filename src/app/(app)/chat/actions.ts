'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

export async function sendMessage(topicId: string, content: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  await createAdminClient().from('messages').insert({
    channel_id: topicId,
    user_id: user.id,
    content,
  })
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
  await createAdminClient().from('private_messages').insert({
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
}

export async function deletePrivateMessage(messageId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const admin = createAdminClient()
  const { data: msg } = await admin.from('private_messages').select('sender_id').eq('id', messageId).single()
  if (!msg) return
  if (msg.sender_id !== user.id) return
  await admin.from('private_messages')
    .update({ deleted_for_all: true, content: null })
    .eq('id', messageId)
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

export async function editPrivateMessage(messageId: string, content: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const admin = createAdminClient()
  const { data: msg } = await admin.from('private_messages').select('sender_id').eq('id', messageId).single()
  if (!msg || msg.sender_id !== user.id) return
  await admin.from('private_messages').update({ content, edited_at: new Date().toISOString() }).eq('id', messageId)
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

export async function getChatUploadUrl(): Promise<{ signedUrl?: string; publicUrl?: string; error?: string }> {
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

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

export async function sendPrivateMessage(receiverId: string, content: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  await createAdminClient().from('private_messages').insert({
    sender_id: user.id,
    receiver_id: receiverId,
    content,
    job_id: null,
    is_read: false,
  })
}

export async function deletePrivateMessage(messageId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const admin = createAdminClient()
  const { data: msg } = await admin.from('private_messages').select('sender_id').eq('id', messageId).single()
  if (!msg) return
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (msg.sender_id !== user.id && profile?.role !== 'admin') return
  await admin.from('private_messages').delete().eq('id', messageId)
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

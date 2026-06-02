import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import ChatClient from './ChatClient'
import type { Topic, Profile, PrivateMessage } from '@/types'

interface ChatPageProps {
  searchParams: Promise<{ dm?: string; jobTitle?: string; jobBudget?: string; jobDesc?: string }>
}

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const dmUserId = params.dm ?? null
  const jobTitle = params.jobTitle ?? null
  const jobBudget = params.jobBudget ?? null
  const jobDesc = params.jobDesc ?? null

  const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  const admin = createAdminClient()
  const isAdmin = profileData?.role === 'admin'

  const [topicsRes, categoriesRes, privMsgsRes] = await Promise.all([
    supabase.from('topics').select('*, profiles(*)').order('created_at', { ascending: false }),
    supabase.from('chat_categories').select('name').order('created_at', { ascending: true }),
    admin
      .from('private_messages')
      .select('*, sender:profiles!sender_id(*), receiver:profiles!receiver_id(*)')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: true }),
  ])

  const topics = (topicsRes.data ?? []) as Topic[]
  const categories = (categoriesRes.data ?? []).map((c: { name: string }) => c.name)
  const privateMessages = (privMsgsRes.data ?? []) as PrivateMessage[]

  let dmProfile: Profile | null = null
  if (dmUserId) {
    const { data } = await admin.from('profiles').select('*').eq('id', dmUserId).single()
    dmProfile = data
  }

  let initialJobQuote: string | null = null
  if (jobTitle) {
    const lines = [`📋 פנייה לגבי: ${jobTitle}`]
    if (jobBudget) lines.push(`💰 תקציב: ${jobBudget}`)
    if (jobDesc) lines.push(jobDesc)
    initialJobQuote = lines.join('\n')
  }

  async function createTopic(formData: FormData) {
    'use server'
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

  async function sendMessage(topicId: string, content: string) {
    'use server'
    console.log('[sendMessage] CALLED — topicId:', topicId, 'content:', content)
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('[sendMessage] auth — user:', user?.id ?? 'null', 'authError:', authError)
    if (!user) { console.log('[sendMessage] no user, redirecting'); redirect('/login') }
    const admin = createAdminClient()
    console.log('[sendMessage] admin client created, inserting...')
    const { data, error } = await admin.from('messages').insert({
      channel_id: topicId,
      user_id: user.id,
      content,
    }).select()
    console.log('[sendMessage] result — data:', JSON.stringify(data), 'error:', JSON.stringify(error))
  }

  async function deleteMessage(messageId: string) {
    'use server'
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

  async function sendPrivateMessage(receiverId: string, content: string) {
    'use server'
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

  async function deletePrivateMessage(messageId: string) {
    'use server'
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

  async function markMessagesRead(senderId: string) {
    'use server'
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

  return (
    <ChatClient
      topics={topics}
      categories={categories}
      currentUserId={user.id}
      currentProfile={profileData}
      isAdmin={isAdmin}
      createTopic={createTopic}
      sendMessage={sendMessage}
      deleteMessage={deleteMessage}
      initialPrivateMessages={privateMessages}
      sendPrivateMessage={sendPrivateMessage}
      deletePrivateMessage={deletePrivateMessage}
      markMessagesRead={markMessagesRead}
      initialDmUserId={dmUserId}
      initialDmProfile={dmProfile}
      initialJobQuote={initialJobQuote}
    />
  )
}

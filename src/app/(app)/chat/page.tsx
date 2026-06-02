import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import ChatClient from './ChatClient'
import {
  sendMessage,
  deleteMessage,
  sendPrivateMessage,
  deletePrivateMessage,
  markMessagesRead,
  getChatUploadUrl,
  editPrivateMessage,
  toggleReaction,
} from './actions'
import type { Profile, PrivateMessage } from '@/types'

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

  // Find or create the single community topic
  let { data: generalTopic } = await admin
    .from('topics')
    .select('id')
    .eq('title', 'קהילה')
    .maybeSingle()

  if (!generalTopic) {
    // Try to find any existing topic to use as the general room
    const { data: anyTopic } = await admin
      .from('topics')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    generalTopic = anyTopic
  }

  if (!generalTopic) {
    // Create it
    const { data: created } = await admin
      .from('topics')
      .insert({ title: 'קהילה', category: 'כללי', created_by: user.id })
      .select('id')
      .single()
    generalTopic = created
  }

  const generalTopicId = generalTopic?.id ?? null

  const [privMsgsRes, usersRes] = await Promise.all([
    admin
      .from('private_messages')
      .select('*, sender:profiles!sender_id(*), receiver:profiles!receiver_id(*), reply_to:private_messages!reply_to_id(id,content,sender_id)')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: true }),
    admin
      .from('profiles')
      .select('id, full_name, username, avatar_url, specialization')
      .eq('status', 'active')
      .neq('id', user.id)
      .order('full_name', { ascending: true }),
  ])

  const privateMessages = (privMsgsRes.data ?? []) as PrivateMessage[]
  const activeUsers = (usersRes.data ?? []) as Profile[]

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

  return (
    <ChatClient
      generalTopicId={generalTopicId}
      currentUserId={user.id}
      currentProfile={profileData}
      isAdmin={isAdmin}
      sendMessage={sendMessage}
      deleteMessage={deleteMessage}
      initialPrivateMessages={privateMessages}
      sendPrivateMessage={sendPrivateMessage}
      deletePrivateMessage={deletePrivateMessage}
      markMessagesRead={markMessagesRead}
      initialDmUserId={dmUserId}
      initialDmProfile={dmProfile}
      initialJobQuote={initialJobQuote}
      activeUsers={activeUsers}
      getChatUploadUrl={getChatUploadUrl}
      editPrivateMessage={editPrivateMessage}
      toggleReaction={toggleReaction}
    />
  )
}

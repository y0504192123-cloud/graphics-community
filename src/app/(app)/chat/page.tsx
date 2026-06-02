import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import ChatClient from './ChatClient'
import {
  createTopic,
  sendMessage,
  deleteMessage,
  sendPrivateMessage,
  deletePrivateMessage,
  markMessagesRead,
} from './actions'
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

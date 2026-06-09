import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import ChatClient from './ChatClient'
import {
  sendMessage,
  editMessage,
  deleteMessage,
  toggleCommunityReaction,
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
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: true }),
    admin
      .from('profiles')
      .select('id, full_name, username, avatar_url, specialization')
      .eq('status', 'active')
      .neq('id', user.id)
      .order('full_name', { ascending: true }),
  ])

  const msgsRaw = (privMsgsRes.data ?? []) as PrivateMessage[]

  // Fetch profiles and reply_to messages explicitly (avoids FK join requirement)
  const pmUserIds = Array.from(new Set(msgsRaw.flatMap(m => [m.sender_id, m.receiver_id])))
  const replyToIds = msgsRaw.map(m => m.reply_to_id).filter(Boolean) as string[]

  const [pmProfilesRes, replyMsgsRes] = await Promise.all([
    pmUserIds.length ? admin.from('profiles').select('id, full_name, username, avatar_url, specialization, role, status, created_at').in('id', pmUserIds) : Promise.resolve({ data: [] }),
    replyToIds.length ? admin.from('private_messages').select('id, content, sender_id').in('id', replyToIds) : Promise.resolve({ data: [] }),
  ])
  const pmProfilesMap = Object.fromEntries(((pmProfilesRes.data ?? []) as Profile[]).map(p => [p.id, p]))
  const replyMap = Object.fromEntries(((replyMsgsRes.data ?? []) as { id: string; content: string | null; sender_id: string }[]).map(r => [r.id, r]))

  // Fetch badges for all participants
  const allChatUserIds = Array.from(new Set([...pmUserIds, user.id]))
  const { data: chatBadgesData } = await admin.from('profile_badges').select('user_id, user_badges(*)').in('user_id', allChatUserIds)
  const chatBadgesMap: Record<string, any[]> = {}
  for (const pb of (chatBadgesData ?? []) as any[]) {
    if (!chatBadgesMap[pb.user_id]) chatBadgesMap[pb.user_id] = []
    if (pb.user_badges) chatBadgesMap[pb.user_id].push(pb.user_badges)
  }

  const privateMessages = msgsRaw.map(m => ({
    ...m,
    sender: pmProfilesMap[m.sender_id],
    receiver: pmProfilesMap[m.receiver_id],
    reply_to: m.reply_to_id ? (replyMap[m.reply_to_id] ?? null) : null,
  })) as PrivateMessage[]
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
      editMessage={editMessage}
      deleteMessage={deleteMessage}
      toggleCommunityReaction={toggleCommunityReaction}
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
      badgesMap={chatBadgesMap}
    />
  )
}

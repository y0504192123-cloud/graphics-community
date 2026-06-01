import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import ChatClient from './ChatClient'
import type { Topic } from '@/types'

export default async function ChatPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  const [topicsRes, categoriesRes] = await Promise.all([
    supabase.from('topics').select('*, profiles(*)').order('created_at', { ascending: false }),
    supabase.from('chat_categories').select('name').order('created_at', { ascending: true }),
  ])

  const topics = (topicsRes.data ?? []) as Topic[]
  const categories = (categoriesRes.data ?? []).map((c: { name: string }) => c.name)

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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')
    await supabase.from('messages').insert({
      channel_id: topicId,
      user_id: user.id,
      content,
    })
  }

  return (
    <ChatClient
      topics={topics}
      categories={categories}
      currentUserId={user.id}
      currentProfile={profileData}
      createTopic={createTopic}
      sendMessage={sendMessage}
    />
  )
}

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import FontIdentifierClient from './FontIdentifierClient'
import { identifyFont } from './actions'

export type FontConversationRow = {
  id: string
  user_id: string
  role: 'user' | 'assistant'
  content: string
  image_url: string | null
  created_at: string
}

export default async function FontIdentifierPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: historyData } = await admin
    .from('font_conversations')
    .select('id, role, content, image_url, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(200)

  const initialHistory = (historyData ?? []) as FontConversationRow[]

  return (
    <FontIdentifierClient
      identifyFont={identifyFont}
      initialHistory={initialHistory}
    />
  )
}

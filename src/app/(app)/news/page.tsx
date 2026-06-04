import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { NewsItem } from '@/types'
import NewsPageClient from './NewsPageClient'

export default async function NewsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Auto-archive expired items on every page load
  await createAdminClient().rpc('archive_expired_news').catch(() => {})

  const { data } = await supabase
    .from('news')
    .select('*, profiles(*), news_categories(*)')
    .eq('is_archived', false)
    .order('created_at', { ascending: false })
    .limit(50)

  const { count: archiveCount } = await supabase
    .from('news')
    .select('id', { count: 'exact', head: true })
    .eq('is_archived', true)

  return (
    <NewsPageClient
      newsItems={(data ?? []) as NewsItem[]}
      archiveCount={archiveCount ?? 0}
    />
  )
}

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { NewsItem } from '@/types'
import NewsPageClient from './NewsPageClient'

export default async function NewsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('news')
    .select('*, profiles(*), news_categories(*)')
    .order('created_at', { ascending: false })
    .limit(50)

  return <NewsPageClient newsItems={(data ?? []) as NewsItem[]} />
}

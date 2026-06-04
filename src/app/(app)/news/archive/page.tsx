import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { NewsItem } from '@/types'
import ArchivePageClient from './ArchivePageClient'

export default async function NewsArchivePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('news')
    .select('*, profiles(*), news_categories(*)')
    .eq('is_archived', true)
    .order('created_at', { ascending: false })
    .limit(100)

  return <ArchivePageClient newsItems={(data ?? []) as NewsItem[]} />
}

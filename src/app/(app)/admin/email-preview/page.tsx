import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import EmailPreviewClient from './EmailPreviewClient'

export default async function EmailPreviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if ((prof as any)?.role !== 'admin') redirect('/dashboard')

  const admin = createAdminClient()
  const { data: adminCats } = await admin.from('forum_categories').select('id').eq('admin_only', true)
  const catIds = (adminCats ?? []).map((c: { id: string }) => c.id)

  type Thread = { id: string; title: string; category_id: string; images: string[] | null; image_url: string | null }
  let threads: Thread[] = []
  if (catIds.length) {
    const { data } = await admin
      .from('forum_threads')
      .select('id, title, category_id, images, image_url')
      .in('category_id', catIds)
      .order('created_at', { ascending: false })
      .limit(30)
    threads = (data ?? []) as Thread[]
  }

  return <EmailPreviewClient threads={threads} />
}

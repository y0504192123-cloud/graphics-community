import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import InspirationClient from './InspirationClient'
import type { InspirationPost } from '@/types'

export default async function InspirationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [postsRes, commentsRes, catsRes] = await Promise.all([
    supabase.from('inspiration_posts').select('*, profiles(*)').order('created_at', { ascending: false }),
    supabase.from('inspiration_comments').select('post_id'),
    supabase.from('inspiration_categories').select('name').order('name', { ascending: true }),
  ])

  const countMap: Record<string, number> = {}
  for (const c of commentsRes.data ?? []) {
    countMap[c.post_id] = (countMap[c.post_id] ?? 0) + 1
  }

  const posts: InspirationPost[] = (postsRes.data ?? []).map((p) => ({
    ...p,
    comment_count: countMap[p.id] ?? 0,
  }))

  const categories: string[] = (catsRes.data ?? []).map((c) => c.name)

  async function createPost(
    _prev: { error?: string } | null,
    formData: FormData,
  ): Promise<{ error?: string } | null> {
    'use server'
    try {
      const supabase = await createClient()
      const { data: { user }, error: authErr } = await supabase.auth.getUser()
      console.log('[createPost] user:', user?.id ?? null, 'authErr:', authErr?.message ?? null)
      if (!user) return { error: 'לא מחובר' }

      const imageUrl = (formData.get('image_url') as string)?.trim()
      const title    = (formData.get('title')     as string)?.trim()
      console.log('[createPost] imageUrl:', imageUrl ? '✓' : '✗ MISSING', '| title:', title || '✗ MISSING')
      if (!imageUrl) return { error: 'תמונה חסרה' }
      if (!title)    return { error: 'כותרת חובה' }

      const tagsRaw = (formData.get('tags') as string)?.trim()
      const tags = tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : []

      const admin = createAdminClient()
      const { error } = await admin.from('inspiration_posts').insert({
        user_id: user.id,
        title,
        description: (formData.get('description') as string)?.trim() || null,
        image_url: imageUrl,
        category: (formData.get('category') as string) || null,
        tags,
      })
      console.log('[createPost] insert error:', error?.message ?? 'none')
      if (error) return { error: error.message }

      revalidatePath('/inspiration')
      return null
    } catch (err) {
      console.error('[createPost] unexpected error:', err)
      return { error: String(err) }
    }
  }

  async function deletePost(postId: string): Promise<void> {
    'use server'
    const admin = createAdminClient()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await admin.from('inspiration_posts').delete().eq('id', postId).eq('user_id', user.id)
    revalidatePath('/inspiration')
  }

  async function getSignedUploadUrl(): Promise<{ signedUrl?: string; publicUrl?: string; error?: string }> {
    'use server'
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { error: 'לא מחובר' }

      const admin = createAdminClient()
      const path = `${user.id}/${Date.now()}.jpg`

      const { data, error } = await admin.storage.from('portfolio').createSignedUploadUrl(path)
      if (error) return { error: error.message }

      const { data: { publicUrl } } = admin.storage.from('portfolio').getPublicUrl(path)
      return { signedUrl: data.signedUrl, publicUrl }
    } catch (err) {
      return { error: String(err) }
    }
  }

  return (
    <InspirationClient
      posts={posts}
      currentUserId={user.id}
      categories={categories}
      createPost={createPost}
      deletePost={deletePost}
      getSignedUploadUrl={getSignedUploadUrl}
    />
  )
}

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import InspirationClient from './InspirationClient'
import type { InspirationPost } from '@/types'

export default async function InspirationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [postsRes, commentsRes] = await Promise.all([
    supabase.from('inspiration_posts').select('*, profiles(*)').order('created_at', { ascending: false }),
    supabase.from('inspiration_comments').select('post_id'),
  ])

  const countMap: Record<string, number> = {}
  for (const c of commentsRes.data ?? []) {
    countMap[c.post_id] = (countMap[c.post_id] ?? 0) + 1
  }

  const posts: InspirationPost[] = (postsRes.data ?? []).map((p) => ({
    ...p,
    comment_count: countMap[p.id] ?? 0,
  }))

  async function createPost(
    _prev: { error?: string } | null,
    formData: FormData,
  ): Promise<{ error?: string } | null> {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'לא מחובר' }

    const imageUrl = (formData.get('image_url') as string)?.trim()
    if (!imageUrl) return { error: 'תמונה חסרה' }

    const title = (formData.get('title') as string)?.trim()
    if (!title) return { error: 'כותרת חובה' }

    const tagsRaw = (formData.get('tags') as string)?.trim()
    const tags = tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : []

    const { error } = await supabase.from('inspiration_posts').insert({
      user_id: user.id,
      title,
      description: (formData.get('description') as string)?.trim() || null,
      image_url: imageUrl,
      category: (formData.get('category') as string) || null,
      tags,
    })
    if (error) return { error: error.message }

    revalidatePath('/inspiration')
    return null
  }

  async function deletePost(postId: string): Promise<void> {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('inspiration_posts').delete().eq('id', postId).eq('user_id', user.id)
    revalidatePath('/inspiration')
  }

  return (
    <InspirationClient
      posts={posts}
      currentUserId={user.id}
      createPost={createPost}
      deletePost={deletePost}
    />
  )
}

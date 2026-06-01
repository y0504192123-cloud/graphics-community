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

  async function uploadPost(
    _prev: { error?: string } | null,
    formData: FormData,
  ): Promise<{ error?: string } | null> {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'לא מחובר' }

    const file = formData.get('image') as File
    if (!file || file.size === 0) return { error: 'נא לבחור תמונה' }
    if (file.size > 10 * 1024 * 1024) return { error: 'הקובץ גדול מדי (מקסימום 10MB)' }

    const admin = createAdminClient()
    const ext = file.name.split('.').pop() ?? 'jpg'
    const fileName = `${user.id}/${Date.now()}.${ext}`
    const bytes = await file.arrayBuffer()

    const { data: uploadData, error: uploadError } = await admin.storage
      .from('portfolio')
      .upload(fileName, bytes, { contentType: file.type, upsert: false })
    if (uploadError) return { error: uploadError.message }

    const { data: { publicUrl } } = admin.storage.from('portfolio').getPublicUrl(uploadData.path)

    const tagsRaw = (formData.get('tags') as string)?.trim()
    const tags = tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : []

    const title = (formData.get('title') as string)?.trim()
    if (!title) return { error: 'כותרת חובה' }

    const { error: insertError } = await supabase.from('inspiration_posts').insert({
      user_id: user.id,
      title,
      description: (formData.get('description') as string)?.trim() || null,
      image_url: publicUrl,
      category: (formData.get('category') as string) || null,
      tags,
    })
    if (insertError) return { error: insertError.message }

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
      uploadPost={uploadPost}
      deletePost={deletePost}
    />
  )
}

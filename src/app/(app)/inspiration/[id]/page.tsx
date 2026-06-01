import { redirect, notFound } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import PostClient from './PostClient'
import type { InspirationPost, InspirationComment } from '@/types'

export default async function InspirationPostPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [postRes, commentsRes] = await Promise.all([
    supabase.from('inspiration_posts').select('*, profiles(*)').eq('id', id).single(),
    supabase.from('inspiration_comments').select('*, profiles(*)').eq('post_id', id).order('created_at', { ascending: true }),
  ])

  if (!postRes.data) notFound()

  async function addComment(
    _prev: { error?: string } | null,
    formData: FormData,
  ): Promise<{ error?: string } | null> {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'לא מחובר' }
    const content = (formData.get('content') as string)?.trim()
    if (!content) return { error: 'תוכן התגובה לא יכול להיות ריק' }
    const { error } = await supabase.from('inspiration_comments').insert({
      post_id: id,
      user_id: user.id,
      content,
    })
    if (error) return { error: error.message }
    revalidatePath(`/inspiration/${id}`)
    return null
  }

  async function deleteComment(commentId: string): Promise<void> {
    'use server'
    const supabase = await createClient()
    await supabase.from('inspiration_comments').delete().eq('id', commentId)
    revalidatePath(`/inspiration/${id}`)
  }

  return (
    <PostClient
      post={postRes.data as InspirationPost}
      comments={(commentsRes.data ?? []) as InspirationComment[]}
      currentUserId={user.id}
      addComment={addComment}
      deleteComment={deleteComment}
    />
  )
}

'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function createThread(categoryId: string, title: string, content: string, imageUrls?: string[], tags?: string[]): Promise<{ threadId?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'לא מחובר' }
  // Use admin client so the returning select is never blocked by RLS
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('forum_threads')
    .insert({ category_id: categoryId, user_id: user.id, title: title.trim(), content: content.trim(), images: imageUrls ?? [], tags: tags ?? [] })
    .select('id')
    .single()
  if (error || !data?.id) return { error: error?.message ?? 'שגיאה ביצירת נושא' }
  revalidatePath(`/forum/${categoryId}`)
  return { threadId: data.id }
}

export async function createReply(threadId: string, categoryId: string, content: string, imageUrls?: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const admin = createAdminClient()
  await supabase.from('forum_replies').insert({ thread_id: threadId, user_id: user.id, content: content.trim(), images: imageUrls ?? [] })
  const { data: thread } = await admin.from('forum_threads').select('title, followers').eq('id', threadId).single()
  await admin.from('forum_threads').update({ updated_at: new Date().toISOString() }).eq('id', threadId)
  // Notify followers
  try {
    const followerIds: string[] = ((thread?.followers ?? []) as string[]).filter((id: string) => id !== user.id)
    if (followerIds.length) {
      await admin.from('notifications').insert(
        followerIds.map((uid: string) => ({
          user_id: uid, type: 'forum_reply',
          content: `תגובה חדשה בנושא "${thread?.title}"`,
          link: `/forum/${categoryId}/${threadId}`,
        }))
      )
    }
  } catch {}
  revalidatePath(`/forum/${categoryId}/${threadId}`)
}

export async function getForumImageUploadUrl(): Promise<{ signedUrl?: string; publicUrl?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'לא מחובר' }
  const admin = createAdminClient()
  const path = `${user.id}/${Date.now()}`
  const { data, error } = await admin.storage.from('forum-images').createSignedUploadUrl(path)
  if (error) return { error: error.message }
  const { data: { publicUrl } } = admin.storage.from('forum-images').getPublicUrl(path)
  return { signedUrl: data.signedUrl, publicUrl }
}

export async function editReply(replyId: string, threadId: string, categoryId: string, content: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const admin = createAdminClient()
  const { data: reply } = await admin.from('forum_replies').select('user_id').eq('id', replyId).single()
  if (!reply || reply.user_id !== user.id) return
  await admin.from('forum_replies').update({ content: content.trim(), edited_at: new Date().toISOString() }).eq('id', replyId)
  revalidatePath(`/forum/${categoryId}/${threadId}`)
}

export async function deleteReply(replyId: string, threadId: string, categoryId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const admin = createAdminClient()
  const { data: reply } = await admin.from('forum_replies').select('user_id').eq('id', replyId).single()
  if (!reply) return
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (reply.user_id !== user.id && profile?.role !== 'admin') return
  await admin.from('forum_replies').delete().eq('id', replyId)
  revalidatePath(`/forum/${categoryId}/${threadId}`)
}

export async function deleteThread(threadId: string, categoryId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const admin = createAdminClient()
  const { data: thread } = await admin.from('forum_threads').select('user_id').eq('id', threadId).single()
  if (!thread) return
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (thread.user_id !== user.id && profile?.role !== 'admin') return
  await admin.from('forum_threads').delete().eq('id', threadId)
  redirect(`/forum/${categoryId}`)
}

export async function toggleLike(replyId: string, threadId: string, categoryId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { data: existing } = await supabase
    .from('forum_likes').select('id').eq('reply_id', replyId).eq('user_id', user.id).maybeSingle()
  if (existing) {
    await supabase.from('forum_likes').delete().eq('id', existing.id)
  } else {
    await supabase.from('forum_likes').insert({ reply_id: replyId, user_id: user.id })
  }
  revalidatePath(`/forum/${categoryId}/${threadId}`)
}

export async function markBestAnswer(replyId: string, threadId: string, categoryId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const admin = createAdminClient()
  const { data: thread } = await admin.from('forum_threads').select('user_id').eq('id', threadId).single()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!thread || (thread.user_id !== user.id && profile?.role !== 'admin')) return
  const { data: reply } = await admin.from('forum_replies').select('is_best_answer').eq('id', replyId).single()
  if (reply?.is_best_answer) {
    await admin.from('forum_replies').update({ is_best_answer: false }).eq('id', replyId)
  } else {
    await admin.from('forum_replies').update({ is_best_answer: false }).eq('thread_id', threadId)
    await admin.from('forum_replies').update({ is_best_answer: true }).eq('id', replyId)
  }
  revalidatePath(`/forum/${categoryId}/${threadId}`)
}

export async function editThread(threadId: string, categoryId: string, title: string, content: string, tags?: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'לא מחובר' }
  const admin = createAdminClient()
  const { data: thread } = await admin.from('forum_threads').select('user_id').eq('id', threadId).single()
  if (!thread) return { error: 'לא נמצא' }
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (thread.user_id !== user.id && profile?.role !== 'admin') return { error: 'אין הרשאה' }
  await admin.from('forum_threads').update({ title: title.trim(), content: content.trim(), tags: tags ?? [] }).eq('id', threadId)
  revalidatePath(`/forum/${categoryId}/${threadId}`)
  return {}
}

export async function toggleFollowThread(threadId: string): Promise<{ following: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { following: false }
  const admin = createAdminClient()
  const { data: thread } = await admin.from('forum_threads').select('followers').eq('id', threadId).single()
  const followers: string[] = (thread?.followers ?? []) as string[]
  const isFollowing = followers.includes(user.id)
  await admin.from('forum_threads')
    .update({ followers: isFollowing ? followers.filter(id => id !== user.id) : [...followers, user.id] })
    .eq('id', threadId)
  return { following: !isFollowing }
}

export async function markThreadNotificationsRead(threadId: string, categoryId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('link', `/forum/${categoryId}/${threadId}`)
      .eq('is_read', false)
  } catch {}
}

export async function incrementViews(threadId: string) {
  try {
    await createAdminClient().rpc('increment_thread_views', { thread_id: threadId })
  } catch {}
}

// Admin: manage forum categories
export async function addForumCategory(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'לא מחובר' }
  const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (prof?.role !== 'admin') return { error: 'אין הרשאה' }
  const name = (formData.get('name') as string)?.trim()
  if (!name) return { error: 'שם הקטגוריה לא יכול להיות ריק' }
  const { error } = await createAdminClient().from('forum_categories').insert({
    name,
    description: (formData.get('description') as string)?.trim() || null,
    icon: (formData.get('icon') as string)?.trim() || '💬',
    sort_order: parseInt((formData.get('sort_order') as string) || '0', 10),
  })
  if (error) return { error: error.message }
  revalidatePath('/admin')
  revalidatePath('/forum')
  return null
}

export async function deleteForumCategory(catId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (prof?.role !== 'admin') return
  await createAdminClient().from('forum_categories').delete().eq('id', catId)
  revalidatePath('/admin')
  revalidatePath('/forum')
}

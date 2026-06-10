'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildApprovalEmailHtml, sendApprovalEmail, buildChallengeEmailHtml, sendChallengeEmail } from '@/lib/email'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: prof } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if ((prof as any)?.role !== 'admin') return null
  return admin
}

export async function getApprovalEmailHtml(): Promise<string> {
  const admin = await requireAdmin()
  if (!admin) return ''
  const { data: logoRes } = await admin.from('site_settings').select('value').eq('key', 'logo_url').single()
  return buildApprovalEmailHtml({ name: 'ישראל ישראלי', logoUrl: logoRes?.value ?? null })
}

export async function sendTestApprovalEmail(): Promise<{ error?: string }> {
  const admin = await requireAdmin()
  if (!admin) return { error: 'אין הרשאה' }
  const { data: logoRes } = await admin.from('site_settings').select('value').eq('key', 'logo_url').single()
  try {
    await sendApprovalEmail('y0504192123@gmail.com', 'מנהל', logoRes?.value ?? null)
    return {}
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'שגיאה בשליחה' }
  }
}

export async function getChallengeThreadsList(): Promise<{ id: string; title: string; category_id: string }[]> {
  const admin = await requireAdmin()
  if (!admin) return []
  const { data: adminCats } = await admin.from('forum_categories').select('id').eq('admin_only', true)
  const catIds = ((adminCats ?? []) as { id: string }[]).map(c => c.id)
  if (!catIds.length) return []
  const { data } = await admin
    .from('forum_threads')
    .select('id, title, category_id')
    .in('category_id', catIds)
    .order('created_at', { ascending: false })
    .limit(30)
  return (data ?? []) as { id: string; title: string; category_id: string }[]
}

export async function getAdminChallengeEmailHtml(threadId: string, categoryId: string): Promise<string> {
  const admin = await requireAdmin()
  if (!admin) return ''
  const [threadRes, logoRes] = await Promise.all([
    admin.from('forum_threads').select('title, images, image_url').eq('id', threadId).single(),
    admin.from('site_settings').select('value').eq('key', 'logo_url').single(),
  ])
  if (!threadRes.data) return ''
  const thread = threadRes.data as { title: string; images: string[] | null; image_url: string | null }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const imageUrl = ((thread.images ?? []) as string[])[0] ?? thread.image_url ?? null
  return buildChallengeEmailHtml({
    recipientName: 'חבר יקר',
    threadTitle: thread.title,
    threadUrl: `${appUrl}/forum/${categoryId}/${threadId}`,
    imageUrl,
    unsubscribeUrl: `${appUrl}/api/unsubscribe?uid=PREVIEW`,
    logoUrl: logoRes.data?.value ?? null,
  })
}

export async function sendAdminTestChallengeEmail(threadId: string, categoryId: string): Promise<{ error?: string }> {
  const admin = await requireAdmin()
  if (!admin) return { error: 'אין הרשאה' }
  const [threadRes, logoRes] = await Promise.all([
    admin.from('forum_threads').select('title, images, image_url').eq('id', threadId).single(),
    admin.from('site_settings').select('value').eq('key', 'logo_url').single(),
  ])
  if (!threadRes.data) return { error: 'נושא לא נמצא' }
  const thread = threadRes.data as { title: string; images: string[] | null; image_url: string | null }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const imageUrl = ((thread.images ?? []) as string[])[0] ?? thread.image_url ?? null
  try {
    await sendChallengeEmail({
      to: 'y0504192123@gmail.com',
      recipientName: 'מנהל',
      threadTitle: thread.title,
      threadUrl: `${appUrl}/forum/${categoryId}/${threadId}`,
      imageUrl,
      unsubscribeUrl: `${appUrl}/api/unsubscribe?uid=test`,
      logoUrl: logoRes.data?.value ?? null,
    })
    return {}
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'שגיאה בשליחה' }
  }
}

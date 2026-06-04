'use server'

import { createClient } from '@/lib/supabase/server'

export async function reportContent(
  contentType: string,
  contentId: string,
  reason: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'לא מחובר' }

  const { error } = await supabase.from('content_reports').insert({
    reporter_id: user.id,
    content_type: contentType,
    content_id: contentId,
    reason,
  })
  if (error) return { error: error.message }
  return {}
}

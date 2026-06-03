import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import PortfolioGalleryClient from './PortfolioGalleryClient'
import type { PortfolioItem, Profile } from '@/types'

export type PortfolioItemWithProfile = PortfolioItem & { profiles: Pick<Profile, 'id' | 'full_name' | 'username' | 'avatar_url' | 'avatar_color'> | null }

export default async function PortfolioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data } = await admin
    .from('portfolio_items')
    .select('*, profiles(id, full_name, username, avatar_url, avatar_color)')
    .not('image_url', 'is', null)
    .order('created_at', { ascending: false })

  const items = (data ?? []) as PortfolioItemWithProfile[]

  return <PortfolioGalleryClient items={items} />
}

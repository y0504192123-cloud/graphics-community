import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Profile, Specialization, UserBadge } from '@/types'
import type { Metadata } from 'next'
import PublicProfileClient from './PublicProfileClient'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const admin = createAdminClient()
  const { data } = await admin.from('profiles').select('full_name, username, bio').eq('id', id).single()
  const name = data?.full_name ?? data?.username ?? 'פרופיל גרפיקאי'
  return {
    title: name,
    description: data?.bio ?? `פרופיל של ${name} בקהילת Grafi`,
  }
}

export default async function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = createAdminClient()
  const supabase = await createClient()

  const [
    profileRes, specsRes, selectedSpecsRes,
    currentUserRes, threadsRes, repliesRes, pbRes,
  ] = await Promise.all([
    admin.from('profiles').select('*').eq('id', id).single(),
    admin.from('specializations').select('*'),
    admin.from('profile_specializations').select('specialization_id').eq('profile_id', id),
    supabase.auth.getUser(),
    admin.from('forum_threads').select('id', { count: 'exact', head: true }).eq('user_id', id),
    admin.from('forum_replies').select('id', { count: 'exact', head: true }).eq('user_id', id),
    admin.from('profile_badges').select('badge_id').eq('user_id', id),
  ])

  if (!profileRes.data) notFound()

  const profile = profileRes.data as Profile
  const allSpecs = (specsRes.data ?? []) as Specialization[]
  const selectedSpecIds = (selectedSpecsRes.data ?? []).map((r) => r.specialization_id as string)
  const specs = allSpecs.filter((s) => selectedSpecIds.includes(s.id))
  const currentUserId = currentUserRes.data.user?.id
  const forumTotal = (threadsRes.count ?? 0) + (repliesRes.count ?? 0)
  const isOwnProfile = currentUserId === id

  const pbBadgeIds = (pbRes.data ?? []).map((r: any) => r.badge_id as string)
  let userBadges: UserBadge[] = []
  if (pbBadgeIds.length > 0) {
    const { data: badgeDefs } = await admin.from('user_badges').select('*').in('id', pbBadgeIds)
    userBadges = (badgeDefs ?? []) as UserBadge[]
  }

  return (
    <PublicProfileClient
      profile={profile}
      specs={specs}
      userBadges={userBadges}
      forumTotal={forumTotal}
      currentUserId={currentUserId}
      isOwnProfile={isOwnProfile}
    />
  )
}

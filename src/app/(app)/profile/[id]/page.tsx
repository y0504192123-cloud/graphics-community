import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Star, MapPin, Briefcase, MessageSquare, FileText } from 'lucide-react'
import type { Profile, PortfolioItem, Specialization, UserBadge } from '@/types'
import type { Metadata } from 'next'

const placeholderGradients = [
  'from-violet-100 via-purple-200 to-indigo-200',
  'from-pink-100 via-rose-200 to-purple-200',
  'from-blue-100 via-indigo-200 to-violet-200',
  'from-emerald-100 via-teal-200 to-cyan-200',
]

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
    profileRes, portfolioRes, specsRes, selectedSpecsRes,
    currentUserRes, threadsRes, repliesRes, pbRes,
  ] = await Promise.all([
    admin.from('profiles').select('*').eq('id', id).single(),
    admin.from('portfolio_items').select('*').eq('user_id', id).order('created_at', { ascending: false }),
    admin.from('specializations').select('*'),
    admin.from('profile_specializations').select('specialization_id').eq('profile_id', id),
    supabase.auth.getUser(),
    admin.from('forum_threads').select('id', { count: 'exact', head: true }).eq('author_id', id),
    admin.from('forum_replies').select('id', { count: 'exact', head: true }).eq('author_id', id),
    admin.from('profile_badges').select('badge_id').eq('user_id', id),
  ])

  if (!profileRes.data) notFound()

  const profile = profileRes.data as Profile
  const portfolioItems = (portfolioRes.data ?? []) as PortfolioItem[]
  const allSpecs = (specsRes.data ?? []) as Specialization[]
  const selectedSpecIds = (selectedSpecsRes.data ?? []).map((r) => r.specialization_id as string)
  const specs = allSpecs.filter((s) => selectedSpecIds.includes(s.id))
  const currentUserId = currentUserRes.data.user?.id
  const threadCount = threadsRes.count ?? 0
  const replyCount = repliesRes.count ?? 0
  const forumTotal = threadCount + replyCount
  const isOwnProfile = currentUserId === id

  // Fetch badge definitions for this user
  const pbBadgeIds = (pbRes.data ?? []).map((r: any) => r.badge_id as string)
  let userBadges: UserBadge[] = []
  if (pbBadgeIds.length > 0) {
    const { data: badgeDefs } = await admin.from('user_badges').select('*').in('id', pbBadgeIds)
    userBadges = (badgeDefs ?? []) as UserBadge[]
  }

  const displayName = profile.full_name ?? profile.username ?? 'ללא שם'
  const initials = displayName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="min-h-full" style={{ background: 'var(--bg)' }}>

      {/* Cover */}
      <div
        className="relative h-44 overflow-hidden sm:h-52"
        style={{ background: 'linear-gradient(135deg, #6b21a8 0%, #7c3aed 40%, #a855f7 70%, #6366f1 100%)' }}
      >
        <div className="grid-pattern absolute inset-0 opacity-20" />
        <div
          className="pointer-events-none absolute -start-10 -top-10 h-56 w-56 rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,.4) 0%, transparent 70%)', filter: 'blur(30px)' }}
        />
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6">

        {/* Profile header */}
        <div className="-mt-14 mb-5 flex flex-wrap items-end gap-4">
          <div
            className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full text-xl font-bold sm:h-28 sm:w-28"
            style={{
              background: profile.avatar_color ?? '#7c3aed',
              border: '4px solid white',
              boxShadow: `0 8px 32px ${profile.avatar_color ?? '#7c3aed'}55`,
              color: 'white',
            }}
          >
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={displayName}
                fill
                className="object-cover"
                sizes="112px"
              />
            ) : (
              <span style={{ color: 'white' }}>{initials}</span>
            )}
          </div>

          <div className="flex-1 pb-1">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold sm:text-2xl" style={{ color: 'var(--tx)' }}>{displayName}</h1>
                {profile.username && (
                  <p className="text-sm" style={{ color: 'var(--tx3)' }} dir="ltr">@{profile.username}</p>
                )}
              </div>
              {!isOwnProfile && currentUserId && (
                <Link
                  href="/chat"
                  className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white transition hover:opacity-90 hover:scale-[1.02] shrink-0"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 4px 16px rgba(124,58,237,.35)' }}
                >
                  <MessageSquare size={14} />
                  שלח הודעה פרטית
                </Link>
              )}
              {isOwnProfile && (
                <Link
                  href="/profile"
                  className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition hover:opacity-80 shrink-0"
                  style={{ borderColor: 'var(--bd)', color: 'var(--tx2)' }}
                >
                  עריכת פרופיל
                </Link>
              )}
            </div>

            {userBadges.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {userBadges.map((b) => (
                  <span
                    key={b.id}
                    title={b.description ?? b.name}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold"
                    style={{ background: `${b.color}18`, color: b.color, border: `1px solid ${b.color}30` }}
                  >
                    <span className="text-sm">{b.icon}</span>
                    {b.name}
                  </span>
                ))}
              </div>
            )}
            {specs.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {specs.map((spec) => (
                  <span
                    key={spec.id}
                    className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    style={{ background: 'rgba(124,58,237,.1)', color: '#7c3aed', border: '1px solid rgba(124,58,237,.2)' }}
                  >
                    <Star size={9} />
                    {spec.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="mb-5 flex flex-wrap gap-4">
          {profile.city && (
            <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--tx3)' }}>
              <MapPin size={13} />
              {profile.city}
            </div>
          )}
          {profile.years_experience != null && (
            <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--tx3)' }}>
              <Briefcase size={13} />
              {profile.years_experience} שנות ניסיון
            </div>
          )}
          {forumTotal > 0 && (
            <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--tx3)' }}>
              <FileText size={13} />
              {forumTotal} פוסטים בפורום
            </div>
          )}
        </div>

        {/* Bio */}
        {profile.bio && (
          <p
            className="mb-6 max-w-2xl rounded-2xl px-5 py-4 text-sm leading-relaxed"
            style={{ background: 'var(--s1)', border: '1px solid var(--bd)', color: 'var(--tx2)' }}
          >
            {profile.bio}
          </p>
        )}

        {/* Portfolio */}
        <div className="pb-12">
          <h2 className="mb-5 text-lg font-bold" style={{ color: 'var(--tx)' }}>
            עבודות
            <span className="ms-2 text-sm font-normal" style={{ color: 'var(--tx3)' }}>
              {portfolioItems.length}
            </span>
          </h2>

          {portfolioItems.length === 0 ? (
            <div
              className="flex flex-col items-center gap-4 rounded-3xl py-16 text-center"
              style={{ border: '2px dashed var(--bd)', background: 'var(--s1)' }}
            >
              <span className="text-4xl">🎨</span>
              <p className="text-sm" style={{ color: 'var(--tx3)' }}>אין עבודות עדיין</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {portfolioItems.map((item, i) => (
                <div
                  key={item.id}
                  className="overflow-hidden rounded-2xl"
                  style={{ background: 'var(--s2)', border: '1px solid var(--bd)', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden">
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.title || 'עבודה'}
                        fill
                        className="object-cover transition-transform duration-300 hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        loading="lazy"
                      />
                    ) : (
                      <div className={`h-full w-full bg-gradient-to-br ${placeholderGradients[i % placeholderGradients.length]} flex items-center justify-center`}>
                        <span className="text-4xl opacity-40">🖼️</span>
                      </div>
                    )}
                  </div>
                  {(item.title || item.description) && (
                    <div className="p-4" style={{ borderTop: '1px solid var(--bd)' }}>
                      {item.title && (
                        <p className="font-semibold" style={{ color: 'var(--tx)' }}>{item.title}</p>
                      )}
                      {item.description && (
                        <p className="mt-1 text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--tx3)' }}>
                          {item.description}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

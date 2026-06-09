'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Star, MapPin, Briefcase, MessageSquare, FileText, Globe, ExternalLink } from 'lucide-react'
import { useT } from '@/components/LanguageProvider'
import type { Profile, Specialization, UserBadge } from '@/types'

type Props = {
  profile: Profile
  specs: Specialization[]
  userBadges: UserBadge[]
  forumTotal: number
  currentUserId: string | undefined
  isOwnProfile: boolean
}

export default function PublicProfileClient({ profile, specs, userBadges, forumTotal, currentUserId, isOwnProfile }: Props) {
  const t = useT()

  const displayName = profile.full_name ?? profile.username ?? 'ללא שם'
  const initials = displayName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="min-h-full" style={{ background: 'var(--bg)' }}>

      {/* Cover */}
      <div className="relative h-44 overflow-hidden sm:h-52"
        style={{ background: 'linear-gradient(135deg, #6b21a8 0%, #7c3aed 40%, #a855f7 70%, #6366f1 100%)' }}>
        <div className="grid-pattern absolute inset-0 opacity-20" />
        <div className="pointer-events-none absolute -start-10 -top-10 h-56 w-56 rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,.4) 0%, transparent 70%)', filter: 'blur(30px)' }} />
      </div>

      <div className="mx-auto max-w-4xl px-4 pb-12 sm:px-6">

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
              <Image src={profile.avatar_url} alt={displayName} fill className="object-cover" sizes="112px" />
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
              <div className="flex items-center gap-2">
                {!isOwnProfile && currentUserId && (
                  <Link
                    href={`/chat?dm=${profile.id}`}
                    className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white transition hover:opacity-90 hover:scale-[1.02] shrink-0"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 4px 16px rgba(124,58,237,.35)' }}
                  >
                    <MessageSquare size={14} />
                    {t.profile.sendMessage}
                  </Link>
                )}
                {isOwnProfile && (
                  <Link
                    href="/settings"
                    className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition hover:opacity-80 shrink-0"
                    style={{ borderColor: 'var(--bd)', color: 'var(--tx2)' }}
                  >
                    {t.profile.editProfile}
                  </Link>
                )}
              </div>
            </div>

            {userBadges.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {userBadges.map((b) => (
                  <span key={b.id} title={b.description ?? b.name}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold"
                    style={{ background: `${b.color}18`, color: b.color, border: `1px solid ${b.color}30` }}>
                    <span className="text-sm">{b.icon}</span>
                    {b.name}
                  </span>
                ))}
              </div>
            )}

            {specs.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {specs.map((spec) => (
                  <span key={spec.id}
                    className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    style={{ background: 'rgba(124,58,237,.1)', color: '#7c3aed', border: '1px solid rgba(124,58,237,.2)' }}>
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
              {profile.years_experience} {t.profile.yearsExp}
            </div>
          )}
          {forumTotal > 0 && (
            <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--tx3)' }}>
              <FileText size={13} />
              {forumTotal} {t.profile.forumPosts}
            </div>
          )}
          {profile.portfolio_url && (
            <a
              href={profile.portfolio_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm font-medium transition hover:opacity-70"
              style={{ color: '#7c3aed' }}
            >
              <Globe size={13} />
              {t.profile.portfolio}
              <ExternalLink size={11} />
            </a>
          )}
        </div>

        {/* Specialization text field */}
        {profile.specialization && specs.length === 0 && (
          <div className="mb-4 flex items-center gap-2">
            <span className="rounded-full px-3 py-1 text-sm font-semibold"
              style={{ background: 'rgba(124,58,237,.1)', color: '#7c3aed', border: '1px solid rgba(124,58,237,.2)' }}>
              {profile.specialization}
            </span>
          </div>
        )}

        {/* Bio */}
        {profile.bio && (
          <p className="mb-6 max-w-2xl rounded-2xl px-5 py-4 text-sm leading-relaxed"
            style={{ background: 'var(--s1)', border: '1px solid var(--bd)', color: 'var(--tx2)' }}>
            {profile.bio}
          </p>
        )}

      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { X, LayoutGrid } from 'lucide-react'
import type { PortfolioItemWithProfile } from './page'

type Props = { items: PortfolioItemWithProfile[] }

export default function PortfolioGalleryClient({ items }: Props) {
  const [selected, setSelected] = useState<PortfolioItemWithProfile | null>(null)

  return (
    <div className="min-h-full" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <div
        className="relative overflow-hidden px-6 pb-6 pt-8"
        style={{ background: 'var(--hero)' }}
      >
        <div className="pointer-events-none absolute -top-20 -start-20 h-80 w-80 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,.6) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="grid-pattern absolute inset-0" />
        <div className="relative mx-auto max-w-6xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: 'rgba(124,58,237,.12)', border: '1px solid rgba(124,58,237,.2)' }}>
              <LayoutGrid size={18} style={{ color: '#7c3aed' }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--tx)' }}>גלריית עבודות</h1>
              <p className="text-sm" style={{ color: 'var(--tx3)' }}>{items.length} עבודות מחברי הקהילה</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {items.length === 0 ? (
          <div
            className="flex flex-col items-center gap-4 rounded-3xl py-20 text-center"
            style={{ border: '2px dashed var(--bd)', background: 'var(--s1)' }}
          >
            <span className="text-5xl">🎨</span>
            <p className="font-semibold" style={{ color: 'var(--tx2)' }}>אין עבודות עדיין</p>
            <p className="text-sm" style={{ color: 'var(--tx3)' }}>עבודות שיועלו על-ידי חברי הקהילה יופיעו כאן</p>
          </div>
        ) : (
          <div className="columns-2 gap-4 sm:columns-3 lg:columns-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="mb-4 break-inside-avoid cursor-pointer overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1"
                style={{ background: 'var(--s1)', border: '1px solid var(--bd)', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}
                onClick={() => setSelected(item)}
              >
                <img
                  src={item.image_url!}
                  alt={item.title || 'עבודה'}
                  className="w-full object-cover"
                  loading="lazy"
                />
                {(item.title || item.profiles) && (
                  <div className="p-3">
                    {item.title && (
                      <p className="text-sm font-semibold line-clamp-1" style={{ color: 'var(--tx)' }}>{item.title}</p>
                    )}
                    {item.profiles && (
                      <ProfileChip profile={item.profiles} userId={item.user_id} />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(6px)' }}
          onClick={() => setSelected(null)}
        >
          <div
            className="relative w-full max-w-2xl overflow-hidden rounded-2xl"
            style={{ background: 'var(--s1)', border: '1px solid var(--bd)', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelected(null)}
              className="absolute end-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-sm transition hover:opacity-80"
              style={{ background: 'rgba(0,0,0,.5)', color: 'white' }}
            >
              <X size={14} />
            </button>

            <img
              src={selected.image_url!}
              alt={selected.title || 'עבודה'}
              className="w-full object-contain"
              style={{ maxHeight: '65vh' }}
            />

            <div className="p-5">
              {selected.title && (
                <h2 className="text-lg font-bold" style={{ color: 'var(--tx)' }}>{selected.title}</h2>
              )}
              {selected.description && (
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--tx2)' }}>{selected.description}</p>
              )}
              {selected.profiles && (
                <div className="mt-4 border-t pt-4" style={{ borderColor: 'var(--bd)' }}>
                  <Link
                    href={`/profile/${selected.user_id}`}
                    className="flex items-center gap-3 transition hover:opacity-80"
                    onClick={() => setSelected(null)}
                  >
                    <ProfileAvatar profile={selected.profiles} size={36} />
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--tx)' }}>
                        {selected.profiles.full_name ?? selected.profiles.username ?? 'גרפיקאי'}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--tx3)' }}>לחץ לצפייה בפרופיל</p>
                    </div>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

type AvatarProfile = Pick<import('@/types').Profile, 'id' | 'full_name' | 'username' | 'avatar_url' | 'avatar_color'>

function ProfileAvatar({ profile, size = 28 }: { profile: AvatarProfile; size?: number }) {
  const name = profile.full_name ?? profile.username ?? '?'
  const initials = name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div
      className="shrink-0 flex items-center justify-center rounded-full overflow-hidden text-xs font-bold"
      style={{ width: size, height: size, background: profile.avatar_color ?? '#7c3aed', color: 'white', flexShrink: 0 }}
    >
      {profile.avatar_url
        ? <img src={profile.avatar_url} alt={name} className="h-full w-full object-cover" />
        : <span style={{ color: 'white', fontSize: size * 0.35 }}>{initials}</span>
      }
    </div>
  )
}

function ProfileChip({ profile, userId }: { profile: AvatarProfile; userId: string }) {
  return (
    <Link
      href={`/profile/${userId}`}
      className="mt-1.5 flex items-center gap-1.5 transition hover:opacity-70"
      onClick={(e) => e.stopPropagation()}
    >
      <ProfileAvatar profile={profile} size={18} />
      <span className="text-xs truncate" style={{ color: 'var(--tx3)' }}>
        {profile.full_name ?? profile.username ?? 'גרפיקאי'}
      </span>
    </Link>
  )
}

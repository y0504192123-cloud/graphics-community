import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { Star } from 'lucide-react'
import type { Profile, PortfolioItem, Specialization } from '@/types'

const itemPlaceholders = [
  'from-violet-100 via-purple-200 to-indigo-200',
  'from-pink-100 via-rose-200 to-purple-200',
  'from-blue-100 via-indigo-200 to-violet-200',
  'from-emerald-100 via-teal-200 to-cyan-200',
]

export default async function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = createAdminClient()

  const [profileRes, portfolioRes, specsRes, selectedSpecsRes] = await Promise.all([
    admin.from('profiles').select('*').eq('id', id).single(),
    admin.from('portfolio_items').select('*').eq('user_id', id).order('created_at', { ascending: false }),
    admin.from('specializations').select('*'),
    admin.from('profile_specializations').select('specialization_id').eq('profile_id', id),
  ])

  if (!profileRes.data) notFound()

  const profile = profileRes.data as Profile
  const portfolioItems = (portfolioRes.data ?? []) as PortfolioItem[]
  const allSpecs = (specsRes.data ?? []) as Specialization[]
  const selectedSpecIds = (selectedSpecsRes.data ?? []).map((r) => r.specialization_id as string)
  const specs = allSpecs.filter((s) => selectedSpecIds.includes(s.id))

  const displayName = profile.full_name ?? profile.username ?? 'ללא שם'
  const initials = displayName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="min-h-full" style={{ background: 'var(--bg)' }}>

      {/* Cover */}
      <div
        className="relative h-48 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #6b21a8 0%, #7c3aed 40%, #a855f7 70%, #6366f1 100%)' }}
      >
        <div className="grid-pattern absolute inset-0 opacity-20" />
        <div className="pointer-events-none absolute -start-10 -top-10 h-56 w-56 rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,.4) 0%, transparent 70%)', filter: 'blur(30px)' }} />
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6">

        {/* Profile header */}
        <div className="-mt-14 mb-6 flex items-end gap-5">
          <div
            className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full text-2xl font-bold"
            style={{ background: profile.avatar_color ?? '#7c3aed', border: '4px solid white', boxShadow: `0 8px 32px ${profile.avatar_color ?? '#7c3aed'}55`, color: 'white' }}
          >
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt={displayName} className="h-full w-full object-cover" />
              : <span style={{ color: 'white' }}>{initials}</span>
            }
          </div>
          <div className="pb-1">
            <h1 className="text-2xl font-bold" style={{ color: 'var(--tx)' }}>{displayName}</h1>
            {profile.username && (
              <p className="text-sm" style={{ color: 'var(--tx3)' }} dir="ltr">@{profile.username}</p>
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

        {profile.bio && (
          <p className="mb-6 max-w-2xl rounded-2xl px-5 py-4 text-sm leading-relaxed"
            style={{ background: 'var(--s1)', border: '1px solid var(--bd)', color: 'var(--tx2)' }}>
            {profile.bio}
          </p>
        )}

        {/* Portfolio */}
        <div className="pb-10">
          <h2 className="mb-5 text-lg font-bold" style={{ color: 'var(--tx)' }}>
            עבודות
            <span className="ms-2 text-sm font-normal" style={{ color: 'var(--tx3)' }}>{portfolioItems.length}</span>
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
                  style={{ background: 'white', border: '1px solid var(--bd)', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}
                >
                  <div className="aspect-[4/3] w-full overflow-hidden">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.title || 'עבודה'} className="h-full w-full object-cover" />
                    ) : (
                      <div className={`h-full w-full bg-gradient-to-br ${itemPlaceholders[i % itemPlaceholders.length]} flex items-center justify-center`}>
                        <span className="text-4xl opacity-40">🖼️</span>
                      </div>
                    )}
                  </div>
                  {(item.title || item.description) && (
                    <div className="p-4" style={{ borderTop: '1px solid var(--bd)' }}>
                      {item.title && <p className="font-semibold" style={{ color: 'var(--tx)' }}>{item.title}</p>}
                      {item.description && (
                        <p className="mt-1 text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--tx3)' }}>{item.description}</p>
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

'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Search, Star } from 'lucide-react'
import { useT } from '@/components/LanguageProvider'

type Member = {
  id: string
  full_name: string | null
  username: string | null
  avatar_url: string | null
  avatar_color: string | null
  city: string | null
  specialization: string | null
  created_at: string
  last_seen: string | null
  specNames: string[]
}

type Props = { members: Member[] }

export default function MembersClient({ members }: Props) {
  const t = useT()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return members
    return members.filter((m) => {
      const name = (m.full_name ?? m.username ?? '').toLowerCase()
      const specs = m.specNames.join(' ').toLowerCase() + ' ' + (m.specialization ?? '').toLowerCase()
      return name.includes(q) || specs.includes(q)
    })
  }, [members, query])

  return (
    <div className="min-h-full px-4 py-6 sm:px-6" style={{ background: 'var(--bg)' }}>
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-bold sm:text-2xl" style={{ color: 'var(--tx)' }}>
            {t.members.title}
            <span className="ms-2 text-sm font-normal" style={{ color: 'var(--tx3)' }}>
              ({members.length})
            </span>
          </h1>
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute end-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--tx3)' }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.members.search}
              className="w-full rounded-xl pe-3 ps-9 py-2.5 text-sm outline-none transition"
              style={{ background: 'var(--inp)', border: '1px solid var(--bd)', color: 'var(--tx)' }}
            />
          </div>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <p className="py-16 text-center text-sm" style={{ color: 'var(--tx3)' }}>{t.members.noResults}</p>
        ) : (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((m) => (
              <MemberCard key={m.id} member={m} joinedLabel={t.members.joined} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MemberCard({ member: m, joinedLabel }: { member: Member; joinedLabel: string }) {
  const displayName = m.full_name ?? m.username ?? '—'
  const initials = displayName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  const joinedYear = m.created_at ? new Date(m.created_at).getFullYear() : null
  const allSpecs = m.specNames.length > 0 ? m.specNames : m.specialization ? [m.specialization] : []

  return (
    <Link
      href={`/profile/${m.id}`}
      className="group flex flex-col gap-3 rounded-2xl p-4 transition-all duration-200 hover:shadow-md"
      style={{ background: 'var(--s1)', border: '1px solid var(--bd)' }}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div
          className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-bold"
          style={{
            background: m.avatar_color ?? '#7c3aed',
            boxShadow: `0 4px 12px ${m.avatar_color ?? '#7c3aed'}44`,
            color: 'white',
          }}
        >
          {m.avatar_url ? (
            <Image src={m.avatar_url} alt={displayName} fill className="object-cover" sizes="48px" />
          ) : (
            <span style={{ color: 'white' }}>{initials}</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-sm transition-colors group-hover:text-purple-600" style={{ color: 'var(--tx)' }}>
            {displayName}
          </p>
          {m.username && (
            <p className="truncate text-xs" style={{ color: 'var(--tx3)' }} dir="ltr">@{m.username}</p>
          )}
        </div>
      </div>

      {/* Specs */}
      {allSpecs.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {allSpecs.slice(0, 3).map((s) => (
            <span
              key={s}
              className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
              style={{ background: 'rgba(124,58,237,.1)', color: '#7c3aed', border: '1px solid rgba(124,58,237,.2)' }}
            >
              <Star size={8} />
              {s}
            </span>
          ))}
        </div>
      )}

      {/* Footer: city + joined */}
      <div className="flex items-center justify-between text-xs" style={{ color: 'var(--tx3)' }}>
        {m.city ? (
          <span className="flex items-center gap-1">
            <MapPin size={11} />
            {m.city}
          </span>
        ) : <span />}
        {joinedYear && (
          <span>{joinedLabel} {joinedYear}</span>
        )}
      </div>
    </Link>
  )
}

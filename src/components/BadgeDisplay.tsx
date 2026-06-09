'use client'

import type { UserBadge } from '@/types'

interface Props {
  badges: UserBadge[]
  max?: number
}

export default function BadgeDisplay({ badges, max = 3 }: Props) {
  if (!badges.length) return null
  const shown = badges.slice(0, max)
  return (
    <span className="inline-flex items-center gap-0.5">
      {shown.map(b => (
        <span
          key={b.id}
          title={`${b.name}${b.description ? ` — ${b.description}` : ''}`}
          className="inline-flex items-center justify-center rounded-md px-1.5 py-0.5 text-[10px] font-bold leading-none"
          style={{ background: `${b.color}18`, color: b.color, border: `1px solid ${b.color}30` }}
        >
          <span className="me-0.5 text-[11px]">{b.icon}</span>
          {b.name}
        </span>
      ))}
    </span>
  )
}

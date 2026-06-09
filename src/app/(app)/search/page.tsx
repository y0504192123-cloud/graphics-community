import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { Search, MessagesSquare, User, ImageIcon, Briefcase } from 'lucide-react'

interface Props {
  searchParams: Promise<{ q?: string }>
}

export default async function SearchPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { q } = await searchParams
  const query = (q ?? '').trim()

  const admin = createAdminClient()

  let forumResults: any[] = []
  let designerResults: any[] = []
  let inspirationResults: any[] = []
  let jobResults: any[] = []

  if (query.length >= 2) {
    const [forumRes, designerRes, inspRes, jobsRes] = await Promise.all([
      admin.from('forum_threads')
        .select('id, title, content, created_at, category_id, user_id, profiles:profiles(full_name, username)')
        .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(10),
      admin.from('profiles')
        .select('id, full_name, username, specialization, avatar_url')
        .eq('status', 'active')
        .or(`full_name.ilike.%${query}%,username.ilike.%${query}%,specialization.ilike.%${query}%`)
        .limit(8),
      admin.from('inspiration_posts')
        .select('id, title, image_url, user_id, profiles:profiles(full_name, username)')
        .ilike('title', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(8),
      admin.from('jobs')
        .select('id, title, description, budget_min, budget_max, status, created_at')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(8),
    ])
    forumResults = forumRes.data ?? []
    designerResults = designerRes.data ?? []
    inspirationResults = inspRes.data ?? []
    jobResults = jobsRes.data ?? []
  }

  const total = forumResults.length + designerResults.length + inspirationResults.length + jobResults.length

  return (
    <div className="min-h-full" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="relative overflow-hidden px-6 pb-5 pt-5" style={{ background: 'var(--hero)' }}>
        <div className="grid-pattern absolute inset-0" />
        <div className="relative mx-auto max-w-2xl">
          <h1 className="mb-4 text-xl font-bold" style={{ color: 'var(--tx)' }}>חיפוש</h1>
          <form method="GET" action="/search">
            <div className="relative">
              <Search size={16} className="absolute end-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--tx3)' }} />
              <input
                name="q"
                defaultValue={query}
                autoFocus
                placeholder="חפש פוסטים, גרפיקאים, השראה..."
                className="w-full rounded-2xl pe-4 ps-10 py-3 text-sm outline-none"
                style={{ background: 'var(--inp)', border: '2px solid var(--bd)', color: 'var(--tx)' }}
              />
            </div>
          </form>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-6 space-y-8">
        {query.length < 2 && (
          <p className="text-center text-sm" style={{ color: 'var(--tx3)' }}>הקלד לפחות 2 תווים לחיפוש</p>
        )}

        {query.length >= 2 && total === 0 && (
          <p className="text-center text-sm" style={{ color: 'var(--tx3)' }}>לא נמצאו תוצאות עבור "{query}"</p>
        )}

        {/* Forum results */}
        {forumResults.length > 0 && (
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--tx3)' }}>
              <MessagesSquare size={13} /> פורום ({forumResults.length})
            </h2>
            <div className="space-y-2">
              {forumResults.map((t: any) => (
                <Link key={t.id} href={`/forum/${t.category_id}/${t.id}`}
                  className="block rounded-xl p-3 transition hover:opacity-80"
                  style={{ background: 'var(--s1)', border: '1px solid var(--bd)' }}>
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--tx)' }}>{t.title}</p>
                  <p className="mt-0.5 text-xs truncate" style={{ color: 'var(--tx3)' }}>
                    {(t.profiles as any)?.full_name ?? (t.profiles as any)?.username ?? 'משתמש'}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Designer results */}
        {designerResults.length > 0 && (
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--tx3)' }}>
              <User size={13} /> גרפיקאים ({designerResults.length})
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {designerResults.map((d: any) => (
                <Link key={d.id} href={`/profile/${d.id}`}
                  className="flex items-center gap-3 rounded-xl p-3 transition hover:opacity-80"
                  style={{ background: 'var(--s1)', border: '1px solid var(--bd)' }}>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                    style={{ background: d.avatar_color ?? 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white' }}>
                    {d.avatar_url
                      ? <img src={d.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                      : (d.full_name ?? d.username ?? '?').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold" style={{ color: 'var(--tx)' }}>{d.full_name ?? d.username}</p>
                    {d.specialization && <p className="truncate text-[11px]" style={{ color: 'var(--tx3)' }}>{d.specialization}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Inspiration results */}
        {inspirationResults.length > 0 && (
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--tx3)' }}>
              <ImageIcon size={13} /> השראה ({inspirationResults.length})
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {inspirationResults.map((item: any) => (
                <Link key={item.id} href="/inspiration"
                  className="overflow-hidden rounded-xl transition hover:opacity-80"
                  style={{ background: 'var(--s1)', border: '1px solid var(--bd)' }}>
                  {item.image_url && (
                    <img src={item.image_url} alt={item.title}
                      className="w-full object-cover"
                      style={{ aspectRatio: '16/9', maxHeight: '120px' }} />
                  )}
                  <div className="p-2">
                    <p className="truncate text-xs font-semibold" style={{ color: 'var(--tx)' }}>{item.title}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Job results */}
        {jobResults.length > 0 && (
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--tx3)' }}>
              <Briefcase size={13} /> עבודות ({jobResults.length})
            </h2>
            <div className="space-y-2">
              {jobResults.map((j: any) => (
                <Link key={j.id} href={`/jobs/${j.id}`}
                  className="block rounded-xl p-3 transition hover:opacity-80"
                  style={{ background: 'var(--s1)', border: '1px solid var(--bd)' }}>
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--tx)' }}>{j.title}</p>
                  {(j.budget_min || j.budget_max) && (
                    <p className="mt-0.5 text-xs" style={{ color: '#10b981' }}>
                      {j.budget_min && j.budget_max
                        ? `₪${j.budget_min} – ₪${j.budget_max}`
                        : j.budget_min ? `מ-₪${j.budget_min}` : `עד ₪${j.budget_max}`}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

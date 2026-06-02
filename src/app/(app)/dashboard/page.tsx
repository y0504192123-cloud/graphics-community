import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Briefcase, Image as ImageIcon, MessageSquare, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { Profile, NewsItem } from '@/types'
import NewsSection from './NewsSection'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [profileRes, portfolioRes, jobsRes, newsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user!.id).single(),
    supabase.from('portfolio_items').select('id').eq('user_id', user!.id),
    supabase.from('jobs').select('id').eq('status', 'open'),
    supabase.from('news').select('*, profiles(*)').order('created_at', { ascending: false }).limit(10),
  ])

  const profile = profileRes.data as Profile | null
  const portfolioCount = portfolioRes.data?.length ?? 0
  const openJobsCount = jobsRes.data?.length ?? 0
  const newsItems = (newsRes.data ?? []) as NewsItem[]
  const isAdmin = profile?.role === 'admin'

  const displayName = profile?.full_name ?? profile?.username ?? user?.email?.split('@')[0] ?? 'גרפיקאי'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'בוקר טוב' : hour < 17 ? 'צהריים טובים' : 'ערב טוב'

  const profileIncomplete = !profile?.avatar_url || !profile?.bio

  async function publishNews(
    _prev: { error?: string } | null,
    formData: FormData,
  ): Promise<{ error?: string } | null> {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'לא מחובר' }
    const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (prof?.role !== 'admin') return { error: 'אין הרשאה לפרסם חדשות' }
    const { error } = await supabase.from('news').insert({
      title: formData.get('title') as string,
      content: formData.get('content') as string,
      image_url: (formData.get('image_url') as string) || null,
      created_by: user.id,
    })
    if (error) return { error: error.message }
    revalidatePath('/dashboard')
    return null
  }

  const sideStats = [
    {
      label: 'העבודות שלי',
      value: portfolioCount,
      icon: <ImageIcon size={18} />,
      href: '/profile',
      accent: '#8b5cf6',
      glow: 'rgba(139,92,246,.12)',
    },
    {
      label: 'עבודות פתוחות',
      value: openJobsCount,
      icon: <Briefcase size={18} />,
      href: '/jobs',
      accent: '#6366f1',
      glow: 'rgba(99,102,241,.12)',
    },
    {
      label: "צ'אטים",
      value: null,
      icon: <MessageSquare size={18} />,
      href: '/chat',
      accent: '#34d399',
      glow: 'rgba(52,211,153,.08)',
    },
  ]

  return (
    <div className="min-h-full" style={{ background: 'var(--bg)' }}>

      {/* Hero */}
      <div
        className="relative overflow-hidden px-6 pb-8 pt-8"
        style={{ background: 'var(--hero)' }}
      >
        <div className="pointer-events-none absolute -top-20 -start-20 h-80 w-80 rounded-full opacity-25" style={{ background: 'radial-gradient(circle, rgba(124,58,237,.6) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="pointer-events-none absolute -bottom-10 end-10 h-60 w-60 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, rgba(236,72,153,.5) 0%, transparent 70%)', filter: 'blur(50px)' }} />
        <div className="grid-pattern absolute inset-0" />

        <div className="relative mx-auto max-w-6xl">
          <div className="animate-fade-up">
            <p className="mb-1 text-sm font-medium text-purple-400">{greeting} ☀️</p>
            <h1 className="text-3xl font-bold lg:text-4xl" style={{ color: 'var(--tx)' }}>
              שלום,{' '}
              <Link href="/profile" className="gradient-text hover:opacity-80 transition-opacity">
                {displayName}
              </Link>
            </h1>
            <p className="mt-2" style={{ color: 'var(--tx2)' }}>
              {portfolioCount > 0
                ? `יש לך ${portfolioCount} עבודות — המשך לצמוח!`
                : 'ברוך הבא לקהילה — חקור, שתף ויצור קשרים עם גרפיקאים נוספים.'}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_272px]">

          {/* Main — news feed */}
          <div>
            <NewsSection news={newsItems} isAdmin={isAdmin} publishNews={publishNews} />
          </div>

          {/* Left sidebar — stats + profile completion */}
          <div className="space-y-3">
            {sideStats.map((stat) => (
              <Link
                key={stat.href}
                href={stat.href}
                className="group flex items-center justify-between rounded-2xl p-4 transition-all duration-200 hover:scale-[1.02]"
                style={{
                  background: 'var(--s2)',
                  border: `1px solid ${stat.glow.replace('.08', '.25').replace('.12', '.25')}`,
                  boxShadow: `0 4px 16px ${stat.glow}`,
                }}
              >
                <div>
                  <p className="text-xs" style={{ color: 'var(--tx3)' }}>{stat.label}</p>
                  {stat.value !== null ? (
                    <p className="mt-0.5 text-3xl font-bold" style={{ color: 'var(--tx)' }}>{stat.value}</p>
                  ) : (
                    <p className="mt-0.5 flex items-center gap-1 text-sm font-semibold" style={{ color: stat.accent }}>
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: stat.accent }} />
                      פעיל עכשיו
                    </p>
                  )}
                </div>
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110"
                  style={{ background: stat.glow, color: stat.accent }}
                >
                  {stat.icon}
                </div>
              </Link>
            ))}

            {/* Profile completion — only if incomplete */}
            {profileIncomplete && (
              <div
                className="rounded-2xl p-4"
                style={{ background: 'rgba(234,179,8,.08)', border: '1px solid rgba(234,179,8,.25)' }}
              >
                <p className="text-sm font-semibold text-amber-700">השלם את הפרופיל שלך</p>
                <p className="mt-1 text-xs" style={{ color: 'var(--tx3)' }}>
                  {!profile?.avatar_url && !profile?.bio
                    ? 'חסרה תמונת פרופיל ו-bio'
                    : !profile?.avatar_url
                    ? 'חסרה תמונת פרופיל'
                    : 'חסר bio'}
                </p>
                <Link
                  href="/profile"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-amber-700 transition hover:text-amber-800"
                >
                  עדכן עכשיו <ArrowLeft size={11} />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

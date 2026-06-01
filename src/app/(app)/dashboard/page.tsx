import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Briefcase, Image as ImageIcon, MessageSquare, ArrowLeft, TrendingUp, Zap } from 'lucide-react'
import Link from 'next/link'
import type { Profile, NewsItem } from '@/types'
import NewsSection from './NewsSection'

const portfolioGradients = [
  'from-violet-600/60 via-purple-800/40 to-indigo-900/60',
  'from-pink-600/60 via-rose-800/40 to-purple-900/60',
  'from-blue-600/60 via-indigo-800/40 to-violet-900/60',
  'from-emerald-600/60 via-teal-800/40 to-cyan-900/60',
  'from-amber-600/60 via-orange-800/40 to-red-900/60',
  'from-cyan-600/60 via-sky-800/40 to-blue-900/60',
]

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [profileRes, portfolioRes, jobsRes, allPortfolioRes, newsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user!.id).single(),
    supabase.from('portfolio_items').select('id').eq('user_id', user!.id),
    supabase.from('jobs').select('id').eq('status', 'open'),
    supabase.from('portfolio_items').select('*').eq('user_id', user!.id).limit(6),
    supabase.from('news').select('*, profiles(*)').order('created_at', { ascending: false }).limit(5),
  ])

  const profile = profileRes.data as Profile | null
  const portfolioCount = portfolioRes.data?.length ?? 0
  const openJobsCount = jobsRes.data?.length ?? 0
  const portfolioPreview = allPortfolioRes.data ?? []
  const newsItems = (newsRes.data ?? []) as NewsItem[]
  const isAdmin = profile?.role === 'admin'

  const displayName = profile?.full_name ?? profile?.username ?? user?.email?.split('@')[0] ?? 'גרפיקאי'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'בוקר טוב' : hour < 17 ? 'צהריים טובים' : 'ערב טוב'

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

  const stats = [
    {
      label: 'העבודות שלי',
      value: portfolioCount,
      icon: <ImageIcon size={18} />,
      href: '/profile',
      border: 'rgba(139,92,246,.25)',
      glow: 'rgba(139,92,246,.12)',
      accent: 'text-violet-400',
      trend: `${portfolioCount > 0 ? 'פעיל' : 'הוסף עבודות'}`,
    },
    {
      label: 'עבודות פתוחות',
      value: openJobsCount,
      icon: <Briefcase size={18} />,
      href: '/jobs',
      border: 'rgba(99,102,241,.25)',
      glow: 'rgba(99,102,241,.12)',
      accent: 'text-blue-400',
      trend: 'זמינות עכשיו',
    },
    {
      label: "צ'אטים",
      value: null,
      icon: <MessageSquare size={18} />,
      href: '/chat',
      border: 'rgba(52,211,153,.2)',
      glow: 'rgba(52,211,153,.08)',
      accent: 'text-emerald-400',
      trend: 'פעיל עכשיו',
    },
  ]

  const quickActions = [
    { label: "צ'אטים", desc: 'שוחח עם הקהילה', href: '/chat', icon: <MessageSquare size={16} />, gradient: 'from-emerald-600 to-teal-700' },
    { label: 'מצא עבודה', desc: 'עיין בהזדמנויות', href: '/jobs', icon: <Briefcase size={16} />, gradient: 'from-blue-600 to-indigo-700' },
    { label: 'ספריית השראה', desc: 'פונטים, תבניות, ברשים', href: '/assets', icon: <Zap size={16} />, gradient: 'from-amber-600 to-orange-700' },
  ]

  return (
    <div className="min-h-full" style={{ background: 'var(--bg)' }}>

      {/* Hero */}
      <div
        className="relative overflow-hidden px-6 pb-10 pt-8"
        style={{ background: 'linear-gradient(135deg, #0f0616 0%, var(--bg) 70%)' }}
      >
        <div className="pointer-events-none absolute -top-20 -start-20 h-80 w-80 rounded-full opacity-25" style={{ background: 'radial-gradient(circle, rgba(124,58,237,.6) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="pointer-events-none absolute -bottom-10 end-10 h-60 w-60 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, rgba(236,72,153,.5) 0%, transparent 70%)', filter: 'blur(50px)' }} />
        <div className="grid-pattern absolute inset-0" />

        <div className="relative mx-auto max-w-6xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="animate-fade-up">
              <p className="mb-1 text-sm font-medium text-purple-400">{greeting} ☀️</p>
              <h1 className="text-3xl font-bold text-white lg:text-4xl">
                שלום,{' '}
                {/* Clickable name → profile */}
                <Link href="/profile" className="gradient-text hover:opacity-80 transition-opacity">
                  {displayName}
                </Link>
              </h1>
              <p className="mt-2 text-slate-400">
                {portfolioCount > 0
                  ? `יש לך ${portfolioCount} עבודות בפורטפוליו — המשך לצמוח!`
                  : 'ברוך הבא לקהילה — חקור, שתף ויצור קשרים עם גרפיקאים נוספים.'}
              </p>
            </div>

            <div
              className="animate-fade-up flex items-center gap-4 rounded-2xl px-5 py-4 animation-delay-300"
              style={{ background: 'var(--inp)', border: '1px solid var(--bd)' }}
            >
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{portfolioCount}</p>
                <p className="text-xs text-slate-500">עבודות</p>
              </div>
              <div className="h-8 w-px" style={{ background: 'var(--bd)' }} />
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{openJobsCount}</p>
                <p className="text-xs text-slate-500">הזדמנויות</p>
              </div>
              <div className="h-8 w-px" style={{ background: 'var(--bd)' }} />
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                  <p className="text-sm font-semibold text-emerald-400">פעיל</p>
                </div>
                <p className="text-xs text-slate-500">סטטוס</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          {stats.map((stat, i) => (
            <Link
              key={stat.label}
              href={stat.href}
              className="group relative animate-fade-up overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5"
              style={{
                border: `1px solid ${stat.border}`,
                boxShadow: `0 4px 20px ${stat.glow}`,
                background: 'var(--s2)',
                animationDelay: `${i * 100}ms`,
              }}
            >
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-400">{stat.label}</p>
                  {stat.value !== null
                    ? <p className="mt-1.5 text-4xl font-bold text-white">{stat.value}</p>
                    : <p className="mt-1.5 text-xl font-bold text-white">→</p>
                  }
                  <div className="mt-2 flex items-center gap-1.5">
                    <TrendingUp size={11} className={stat.accent} />
                    <span className={`text-xs ${stat.accent}`}>{stat.trend}</span>
                  </div>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.accent}`} style={{ background: 'var(--inp)' }}>
                  {stat.icon}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1 text-xs text-slate-500 transition-colors group-hover:text-slate-300">
                <span>צפה</span>
                <ArrowLeft size={11} className="transition-transform group-hover:-translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-3">

          {/* Portfolio preview */}
          <div className="lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">העבודות שלי</h2>
              <Link href="/profile" className="flex items-center gap-1 text-xs font-medium text-purple-400 transition hover:text-purple-300">
                צפה בהכל <ArrowLeft size={12} />
              </Link>
            </div>

            {portfolioPreview.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {portfolioPreview.map((item, i) => (
                  <Link
                    key={item.id}
                    href="/profile"
                    className="group relative aspect-square overflow-hidden rounded-xl"
                    style={{ border: '1px solid var(--bd)' }}
                  >
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    ) : (
                      <div className={`h-full w-full bg-gradient-to-br ${portfolioGradients[i % portfolioGradients.length]} flex items-center justify-center`}>
                        <ImageIcon size={24} className="text-white/30" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/80 via-black/0 to-transparent p-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      <p className="line-clamp-1 text-xs font-medium text-white">{item.title}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div
                className="flex flex-col items-center gap-4 rounded-2xl py-14 text-center"
                style={{ border: '2px dashed rgba(124,58,237,.2)', background: 'rgba(124,58,237,.04)' }}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: 'rgba(124,58,237,.12)' }}>
                  <ImageIcon size={22} className="text-purple-400" />
                </div>
                <div>
                  <p className="font-semibold text-slate-300">אין עבודות עדיין</p>
                  <p className="mt-1 text-sm text-slate-600">הוסף את העבודות הראשונות שלך</p>
                </div>
                <Link href="/profile" className="rounded-xl px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90" style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
                  הוסף עבודה
                </Link>
              </div>
            )}

            {/* News section */}
            <div className="mt-8">
              <NewsSection news={newsItems} isAdmin={isAdmin} publishNews={publishNews} />
            </div>
          </div>

          {/* Quick actions */}
          <div>
            <h2 className="mb-4 text-lg font-bold text-white">פעולות מהירות</h2>
            <div className="space-y-2.5">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group flex items-center gap-4 rounded-xl p-3.5 transition-all duration-200 hover:translate-x-[-2px]"
                  style={{ background: 'var(--inp)', border: '1px solid var(--bd)' }}
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${action.gradient} text-white shadow-lg transition-transform duration-200 group-hover:scale-110`}>
                    {action.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-200 group-hover:text-white">{action.label}</p>
                    <p className="truncate text-xs text-slate-600">{action.desc}</p>
                  </div>
                  <ArrowLeft size={14} className="me-auto shrink-0 text-slate-600 transition-all duration-200 group-hover:-translate-x-0.5 group-hover:text-slate-300" />
                </Link>
              ))}
            </div>

            {(!profile?.full_name || !profile?.bio) && (
              <div className="mt-5 rounded-2xl p-4" style={{ background: 'rgba(234,179,8,.06)', border: '1px solid rgba(234,179,8,.2)' }}>
                <p className="text-sm font-semibold text-amber-300">השלם את הפרופיל שלך</p>
                <p className="mt-1 text-xs text-slate-500">פרופיל מלא מגדיל את הסיכוי שלך</p>
                <Link href="/profile" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-amber-400 transition hover:text-amber-300">
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

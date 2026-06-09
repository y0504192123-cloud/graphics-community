import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Sidebar from './_components/Sidebar'
import FloatingNotifications from './_components/FloatingNotifications'
import type { Profile } from '@/types'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let supabase: Awaited<ReturnType<typeof createClient>>
  try {
    supabase = await createClient()
  } catch {
    redirect('/login?error=auth_failed')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let profileData: Profile | null = null
  let logoUrl: string | null = null
  try {
    const admin = createAdminClient()
    const [profileRes, logoRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      admin.from('site_settings').select('value').eq('key', 'logo_url').single(),
    ])
    profileData = profileRes.data as Profile | null
    logoUrl = logoRes.data?.value ?? null
  } catch {
    // Supabase query threw — treat as missing profile to avoid full crash
  }

  if (!profileData) {
    try {
      await supabase.from('profiles').insert({
        id: user.id,
        email: user.email ?? null,
        full_name: user.user_metadata?.full_name ?? null,
        avatar_url: user.user_metadata?.avatar_url ?? null,
        status: 'pending',
      })
    } catch { /* no-op on conflict */ }
    await supabase.auth.signOut()
    redirect('/login?error=no_profile')
  }

  // Admins always get in regardless of status
  if (profileData.role !== 'admin') {
    const status = profileData.status
    if (status === 'pending') {
      await supabase.auth.signOut()
      redirect('/login?message=pending')
    }
    if (status === 'rejected') {
      await supabase.auth.signOut()
      redirect('/login?message=rejected')
    }
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      <Sidebar profile={profileData as Profile} email={user.email ?? ''} currentUserId={user.id} logoUrl={logoUrl} />
      <main className="flex-1 overflow-y-auto pt-14 lg:pt-0">{children}</main>
      <FloatingNotifications currentUserId={user.id} />
    </div>
  )
}

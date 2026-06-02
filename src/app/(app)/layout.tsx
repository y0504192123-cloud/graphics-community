import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Sidebar from './_components/Sidebar'
import type { Profile } from '@/types'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const admin = createAdminClient()
  const [{ data: profileData }, { data: logoData }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    admin.from('site_settings').select('value').eq('key', 'logo_url').single(),
  ])
  const logoUrl: string | null = logoData?.value ?? null

  if (!profileData) {
    // Attempt insert for genuinely new users (no-op on conflict)
    await supabase.from('profiles').insert({
      id: user.id,
      email: user.email ?? null,
      full_name: user.user_metadata?.full_name ?? null,
      avatar_url: user.user_metadata?.avatar_url ?? null,
      status: 'pending',
    })
    // Must sign out before redirecting — proxy redirects logged-in users away from /login.
    // ?error=no_profile shown when profile can't be read (missing RLS SELECT policy or missing row).
    await supabase.auth.signOut()
    redirect('/login?error=no_profile')
  }

  // Admins always get in regardless of status
  if (profileData.role !== 'admin') {
    const status = profileData.status
    if (status === 'pending' || status === null) {
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
    </div>
  )
}

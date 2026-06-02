import { createAdminClient } from '@/lib/supabase/admin'
import LoginForm from './LoginForm'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>
}) {
  const params = await searchParams
  const { data: logoData } = await createAdminClient()
    .from('site_settings')
    .select('value')
    .eq('key', 'logo_url')
    .single()
  const logoUrl: string | null = logoData?.value ?? null

  return <LoginForm urlError={params.error} urlMessage={params.message} logoUrl={logoUrl} />
}

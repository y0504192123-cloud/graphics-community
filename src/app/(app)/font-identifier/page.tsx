import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import FontIdentifierClient from './FontIdentifierClient'
import { identifyFontFromDB } from './actions'
import type { Font } from '@/types'

export default async function FontIdentifierPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: fontsData } = await admin
    .from('fonts')
    .select('*')
    .order('name', { ascending: true })

  const fonts = (fontsData ?? []) as Font[]

  return (
    <FontIdentifierClient
      identifyFontFromDB={identifyFontFromDB}
      fonts={fonts}
    />
  )
}

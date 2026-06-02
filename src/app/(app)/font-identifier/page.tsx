import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import FontIdentifierClient from './FontIdentifierClient'
import { identifyFont } from './actions'

export default async function FontIdentifierPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return <FontIdentifierClient identifyFont={identifyFont} />
}

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import MembersClient from './MembersClient'

export default async function MembersPage() {
  const supabase = await createClient()
  const admin = createAdminClient()

  const [profilesRes, specsRes, profileSpecsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url, avatar_color, city, specialization, created_at, last_seen')
      .order('created_at', { ascending: false })
      .limit(300),
    supabase.from('specializations').select('id, name'),
    admin.from('profile_specializations').select('profile_id, specialization_id'),
  ])

  const profiles = (profilesRes.data ?? []) as any[]
  const specs = (specsRes.data ?? []) as any[]
  const profileSpecs = (profileSpecsRes.data ?? []) as any[]

  const specMap: Record<string, string> = Object.fromEntries(specs.map((s: any) => [s.id, s.name]))
  const profileSpecsMap: Record<string, string[]> = {}
  for (const ps of profileSpecs) {
    if (!profileSpecsMap[ps.profile_id]) profileSpecsMap[ps.profile_id] = []
    const name = specMap[ps.specialization_id]
    if (name) profileSpecsMap[ps.profile_id].push(name)
  }

  const members = profiles.map((p) => ({
    id: p.id as string,
    full_name: p.full_name as string | null,
    username: p.username as string | null,
    avatar_url: p.avatar_url as string | null,
    avatar_color: p.avatar_color as string | null,
    city: p.city as string | null,
    specialization: p.specialization as string | null,
    created_at: p.created_at as string,
    last_seen: p.last_seen as string | null,
    specNames: profileSpecsMap[p.id] ?? [],
  }))

  return <MembersClient members={members} />
}

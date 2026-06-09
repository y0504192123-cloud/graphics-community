import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import ProfileClient from './ProfileClient'
import type { Profile, Specialization } from '@/types'

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [profileRes, specsRes, selectedSpecsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('specializations').select('*').order('name', { ascending: true }),
    supabase.from('profile_specializations').select('specialization_id').eq('profile_id', user.id),
  ])

  async function updateProfile(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: (formData.get('full_name') as string).trim() || null,
        username: (formData.get('username') as string).trim() || null,
        bio: (formData.get('bio') as string).trim() || null,
      })
      .eq('id', user.id)
    if (error) throw new Error(error.message)

    const selectedIds = formData.getAll('specialization_ids') as string[]
    await supabase.from('profile_specializations').delete().eq('profile_id', user.id)
    if (selectedIds.length > 0) {
      await supabase.from('profile_specializations').insert(
        selectedIds.map((sid) => ({ profile_id: user.id, specialization_id: sid }))
      )
    }

    revalidatePath('/profile')
  }

  async function deleteAvatar(): Promise<void> {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: prof } = await supabase.from('profiles').select('avatar_url').eq('id', user.id).single()
    if (prof?.avatar_url) {
      const match = prof.avatar_url.match(/\/avatars\/(.+)$/)
      if (match) {
        await createAdminClient().storage.from('avatars').remove([decodeURIComponent(match[1])])
      }
    }
    await supabase.from('profiles').update({ avatar_url: null }).eq('id', user.id)
    revalidatePath('/profile')
  }

  async function updateAvatarColor(color: string): Promise<void> {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({ avatar_color: color }).eq('id', user.id)
    revalidatePath('/profile')
  }

  async function getAvatarUploadUrl(): Promise<{ signedUrl?: string; publicUrl?: string; error?: string }> {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'לא מחובר' }
    const admin = createAdminClient()
    const path = `${user.id}/${Date.now()}.jpg`
    const { data, error } = await admin.storage.from('avatars').createSignedUploadUrl(path)
    if (error) return { error: error.message }
    const { data: { publicUrl } } = admin.storage.from('avatars').getPublicUrl(path)
    return { signedUrl: data.signedUrl, publicUrl }
  }

  async function updateAvatarUrl(url: string): Promise<void> {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id)
    revalidatePath('/profile')
  }

  const profile = (profileRes.data ?? {
    id: user.id,
    username: null,
    full_name: null,
    avatar_url: null,
    bio: null,
    specialization: null,
    created_at: new Date().toISOString(),
  }) as Profile

  const allSpecializations = (specsRes.data ?? []) as Specialization[]
  const selectedSpecializationIds = (selectedSpecsRes.data ?? []).map((r) => r.specialization_id as string)

  return (
    <ProfileClient
      profile={profile}
      allSpecializations={allSpecializations}
      selectedSpecializationIds={selectedSpecializationIds}
      updateProfile={updateProfile}
      getAvatarUploadUrl={getAvatarUploadUrl}
      updateAvatarUrl={updateAvatarUrl}
      deleteAvatar={deleteAvatar}
      updateAvatarColor={updateAvatarColor}
    />
  )
}

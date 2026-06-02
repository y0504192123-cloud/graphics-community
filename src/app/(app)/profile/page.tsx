import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import ProfileClient from './ProfileClient'
import type { Profile, PortfolioItem, Specialization } from '@/types'

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [profileRes, portfolioRes, specsRes, selectedSpecsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('portfolio_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
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

  async function addPortfolioItem(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    await supabase.from('portfolio_items').insert({
      user_id: user.id,
      title: formData.get('title') as string,
      description: formData.get('description') as string || null,
      image_url: formData.get('image_url') as string || null,
    })

    revalidatePath('/profile')
  }

  async function deletePortfolioItem(id: string) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')
    await supabase.from('portfolio_items').delete().eq('id', id).eq('user_id', user.id)
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
      portfolioItems={(portfolioRes.data ?? []) as PortfolioItem[]}
      allSpecializations={allSpecializations}
      selectedSpecializationIds={selectedSpecializationIds}
      updateProfile={updateProfile}
      addPortfolioItem={addPortfolioItem}
      deletePortfolioItem={deletePortfolioItem}
      getAvatarUploadUrl={getAvatarUploadUrl}
      updateAvatarUrl={updateAvatarUrl}
    />
  )
}

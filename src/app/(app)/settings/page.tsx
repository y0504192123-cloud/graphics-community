import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import SettingsClient from './SettingsClient'
import type { Profile } from '@/types'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'הגדרות חשבון',
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const profile = profileData as Profile | null

  async function updateProfile(formData: FormData): Promise<{ error?: string }> {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'לא מחובר' }

    const { error } = await supabase.from('profiles').update({
      full_name: (formData.get('full_name') as string)?.trim() || null,
      bio: (formData.get('bio') as string)?.trim() || null,
      city: (formData.get('city') as string)?.trim() || null,
      phone: (formData.get('phone') as string)?.trim() || null,
      years_experience: formData.get('years_experience') ? Number(formData.get('years_experience')) : null,
      portfolio_url: (formData.get('portfolio_url') as string)?.trim() || null,
    }).eq('id', user.id)

    if (error) return { error: error.message }
    revalidatePath('/settings')
    revalidatePath('/profile')
    return {}
  }

  async function changePassword(formData: FormData): Promise<{ error?: string }> {
    'use server'
    const supabase = await createClient()
    const newPassword = formData.get('new_password') as string
    const confirmPassword = formData.get('confirm_password') as string

    if (!newPassword || newPassword.length < 6)
      return { error: 'הסיסמה חייבת להכיל לפחות 6 תווים' }
    if (newPassword !== confirmPassword)
      return { error: 'הסיסמאות אינן תואמות' }

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) return { error: error.message }
    return {}
  }

  async function getAvatarUploadUrl(): Promise<{ signedUrl?: string; publicUrl?: string; error?: string }> {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'לא מחובר' }
    const admin = createAdminClient()
    const path = `${user.id}/${Date.now()}.jpg`
    const { data, error } = await admin.storage.from('avatars').createSignedUploadUrl(path)
    if (error || !data) return { error: error?.message ?? 'שגיאה בקבלת URL' }
    const publicUrl = admin.storage.from('avatars').getPublicUrl(path).data.publicUrl
    return { signedUrl: data.signedUrl, publicUrl }
  }

  async function saveAvatarUrl(url: string): Promise<void> {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id)
    revalidatePath('/settings')
    revalidatePath('/profile')
  }

  async function deleteAccount(): Promise<{ error?: string }> {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'לא מחובר' }
    const admin = createAdminClient()
    await supabase.from('profiles').delete().eq('id', user.id)
    const { error } = await admin.auth.admin.deleteUser(user.id)
    if (error) return { error: error.message }
    redirect('/login')
  }

  return (
    <SettingsClient
      profile={profile}
      email={user.email ?? ''}
      updateProfile={updateProfile}
      changePassword={changePassword}
      getAvatarUploadUrl={getAvatarUploadUrl}
      saveAvatarUrl={saveAvatarUrl}
      deleteAccount={deleteAccount}
    />
  )
}

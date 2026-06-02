import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import AdminClient from './AdminClient'
import type { Profile, NewsItem, ChatCategory, Specialization, InspirationCategory, JobCategory, AssetCategory } from '@/types'
import { sendApprovalEmail } from '@/lib/email'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profileData?.role !== 'admin') redirect('/dashboard')

  const admin = createAdminClient()
  const [pendingRes, activeRes, newsRes, catRes, specsRes, inspCatsRes, jobCatsRes, assetCatsRes, logoRes] = await Promise.all([
    admin.from('profiles').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
    admin.from('profiles').select('*').eq('status', 'active').order('created_at', { ascending: false }),
    supabase.from('news').select('*, profiles(*)').order('created_at', { ascending: false }),
    supabase.from('chat_categories').select('*').order('created_at', { ascending: true }),
    supabase.from('specializations').select('*').order('name', { ascending: true }),
    supabase.from('inspiration_categories').select('*').order('name', { ascending: true }),
    supabase.from('job_categories').select('*').order('name', { ascending: true }),
    supabase.from('assets_categories').select('*').order('name', { ascending: true }),
    supabase.from('site_settings').select('value').eq('key', 'logo_url').single(),
  ])

  const pendingUsers          = (pendingRes.data    ?? []) as Profile[]
  const activeUsers           = (activeRes.data     ?? []) as Profile[]
  const newsItems             = (newsRes.data       ?? []) as NewsItem[]
  const categories            = (catRes.data        ?? []) as ChatCategory[]
  const specializations       = (specsRes.data      ?? []) as Specialization[]
  const inspirationCategories = (inspCatsRes.data   ?? []) as InspirationCategory[]
  const jobCategories         = (jobCatsRes.data    ?? []) as JobCategory[]
  const assetCategories       = (assetCatsRes.data  ?? []) as AssetCategory[]
  const currentLogoUrl: string | null = logoRes.data?.value ?? null

  /* ── Server Actions ── */

  async function approveUser(userId: string) {
    'use server'
    const admin = createAdminClient()
    const { data: profile, error: fetchErr } = await admin
      .from('profiles').select('email, full_name').eq('id', userId).single()
    console.log('[approveUser] profile fetched:', profile, 'fetchErr:', fetchErr)
    await admin.from('profiles').update({ status: 'active' }).eq('id', userId)
    console.log('[approveUser] status updated to active')
    if (profile?.email) {
      try {
        const { data: logoData } = await admin.from('site_settings').select('value').eq('key', 'logo_url').single()
        await sendApprovalEmail(profile.email, profile.full_name, logoData?.value ?? null)
      } catch (err) {
        console.error('[approveUser] sendApprovalEmail failed:', err)
      }
    } else {
      console.warn('[approveUser] no email on profile, skipping email send')
    }
    revalidatePath('/admin')
  }

  async function getLogoUploadUrl(): Promise<{ signedUrl?: string; publicUrl?: string; error?: string }> {
    'use server'
    const adminClient = createAdminClient()
    const path = `logo_${Date.now()}.png`
    const { data, error } = await adminClient.storage.from('logos').createSignedUploadUrl(path)
    if (error) return { error: error.message }
    const { data: { publicUrl } } = adminClient.storage.from('logos').getPublicUrl(path)
    return { signedUrl: data.signedUrl, publicUrl }
  }

  async function saveLogoUrl(url: string): Promise<void> {
    'use server'
    const adminClient = createAdminClient()
    const { error } = await adminClient
      .from('site_settings')
      .upsert({ key: 'logo_url', value: url }, { onConflict: 'key' })
    if (error) console.error('[saveLogoUrl] upsert error:', error)
    revalidatePath('/', 'layout')
    revalidatePath('/admin')
  }

  async function rejectUser(userId: string) {
    'use server'
    await createAdminClient().from('profiles').update({ status: 'rejected' }).eq('id', userId)
    revalidatePath('/admin')
  }

  async function makeAdmin(userId: string) {
    'use server'
    await createAdminClient().from('profiles').update({ role: 'admin' }).eq('id', userId)
    revalidatePath('/admin')
  }

  async function removeAdmin(userId: string) {
    'use server'
    await createAdminClient().from('profiles').update({ role: 'user' }).eq('id', userId)
    revalidatePath('/admin')
  }

  async function publishNews(
    _prev: { error?: string } | null,
    formData: FormData,
  ): Promise<{ error?: string } | null> {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'לא מחובר' }
    const { error } = await supabase.from('news').insert({
      title: formData.get('title') as string,
      content: formData.get('content') as string,
      image_url: (formData.get('image_url') as string) || null,
      created_by: user.id,
    })
    if (error) return { error: error.message }
    revalidatePath('/admin')
    revalidatePath('/dashboard')
    return null
  }

  async function deleteNews(newsId: string) {
    'use server'
    const supabase = await createClient()
    await supabase.from('news').delete().eq('id', newsId)
    revalidatePath('/admin')
    revalidatePath('/dashboard')
  }

  async function addCategory(
    _prev: { error?: string } | null,
    formData: FormData,
  ): Promise<{ error?: string } | null> {
    'use server'
    const supabase = await createClient()
    const name = (formData.get('name') as string)?.trim()
    if (!name) return { error: 'שם הקטגוריה לא יכול להיות ריק' }
    const { error } = await supabase.from('chat_categories').insert({ name })
    if (error) return { error: error.message }
    revalidatePath('/admin')
    revalidatePath('/chat')
    return null
  }

  async function deleteCategory(catId: string) {
    'use server'
    const supabase = await createClient()
    await supabase.from('chat_categories').delete().eq('id', catId)
    revalidatePath('/admin')
    revalidatePath('/chat')
  }

  async function addSpecialization(
    _prev: { error?: string } | null,
    formData: FormData,
  ): Promise<{ error?: string } | null> {
    'use server'
    const supabase = await createClient()
    const name = (formData.get('name') as string)?.trim()
    if (!name) return { error: 'שם התחום לא יכול להיות ריק' }
    const { error } = await supabase.from('specializations').insert({ name })
    if (error) return { error: error.message }
    revalidatePath('/admin')
    return null
  }

  async function deleteSpecialization(specId: string) {
    'use server'
    const supabase = await createClient()
    await supabase.from('specializations').delete().eq('id', specId)
    revalidatePath('/admin')
  }

  async function deleteUser(userId: string) {
    'use server'
    const admin = createAdminClient()
    await admin.from('profiles').delete().eq('id', userId)
    await admin.auth.admin.deleteUser(userId)
    revalidatePath('/admin')
  }

  async function addInspirationCategory(
    _prev: { error?: string } | null,
    formData: FormData,
  ): Promise<{ error?: string } | null> {
    'use server'
    const name = (formData.get('name') as string)?.trim()
    if (!name) return { error: 'שם הקטגוריה לא יכול להיות ריק' }
    const { error } = await createAdminClient().from('inspiration_categories').insert({ name })
    if (error) return { error: error.message }
    revalidatePath('/admin')
    revalidatePath('/inspiration')
    return null
  }

  async function deleteInspirationCategory(catId: string) {
    'use server'
    await createAdminClient().from('inspiration_categories').delete().eq('id', catId)
    revalidatePath('/admin')
    revalidatePath('/inspiration')
  }

  async function addJobCategory(
    _prev: { error?: string } | null,
    formData: FormData,
  ): Promise<{ error?: string } | null> {
    'use server'
    const name = (formData.get('name') as string)?.trim()
    if (!name) return { error: 'שם הקטגוריה לא יכול להיות ריק' }
    const { error } = await createAdminClient().from('job_categories').insert({ name })
    if (error) return { error: error.message }
    revalidatePath('/admin')
    revalidatePath('/jobs')
    return null
  }

  async function deleteJobCategory(catId: string) {
    'use server'
    await createAdminClient().from('job_categories').delete().eq('id', catId)
    revalidatePath('/admin')
    revalidatePath('/jobs')
  }

  async function addAssetCategory(
    _prev: { error?: string } | null,
    formData: FormData,
  ): Promise<{ error?: string } | null> {
    'use server'
    const name = (formData.get('name') as string)?.trim()
    if (!name) return { error: 'שם הקטגוריה לא יכול להיות ריק' }
    const { error } = await createAdminClient().from('assets_categories').insert({ name })
    if (error) return { error: error.message }
    revalidatePath('/admin')
    revalidatePath('/assets')
    return null
  }

  async function deleteAssetCategory(catId: string) {
    'use server'
    await createAdminClient().from('assets_categories').delete().eq('id', catId)
    revalidatePath('/admin')
    revalidatePath('/assets')
  }

  return (
    <AdminClient
      pendingUsers={pendingUsers}
      activeUsers={activeUsers}
      newsItems={newsItems}
      categories={categories}
      specializations={specializations}
      approveUser={approveUser}
      rejectUser={rejectUser}
      makeAdmin={makeAdmin}
      removeAdmin={removeAdmin}
      publishNews={publishNews}
      deleteNews={deleteNews}
      addCategory={addCategory}
      deleteCategory={deleteCategory}
      addSpecialization={addSpecialization}
      deleteSpecialization={deleteSpecialization}
      deleteUser={deleteUser}
      inspirationCategories={inspirationCategories}
      addInspirationCategory={addInspirationCategory}
      deleteInspirationCategory={deleteInspirationCategory}
      jobCategories={jobCategories}
      addJobCategory={addJobCategory}
      deleteJobCategory={deleteJobCategory}
      assetCategories={assetCategories}
      addAssetCategory={addAssetCategory}
      deleteAssetCategory={deleteAssetCategory}
      logoUrl={currentLogoUrl}
      getLogoUploadUrl={getLogoUploadUrl}
      saveLogoUrl={saveLogoUrl}
    />
  )
}

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import AdminClient from './AdminClient'
import { addForumCategory, deleteForumCategory } from '../forum/actions'
import type { Profile, NewsItem, ChatCategory, Specialization, InspirationCategory, JobCategory, AssetCategory, ForumCategory, Font, FontWeight } from '@/types'
import { sendApprovalEmail } from '@/lib/email'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profileData?.role !== 'admin') redirect('/dashboard')

  const admin = createAdminClient()
  const [pendingRes, activeRes, newsRes, catRes, specsRes, inspCatsRes, jobCatsRes, assetCatsRes, logoRes, forumCatsRes, fontsRes, fontWeightsRes] = await Promise.all([
    admin.from('profiles').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
    admin.from('profiles').select('*').eq('status', 'active').order('created_at', { ascending: false }),
    supabase.from('news').select('*, profiles(*)').order('created_at', { ascending: false }),
    supabase.from('chat_categories').select('*').order('created_at', { ascending: true }),
    supabase.from('specializations').select('*').order('name', { ascending: true }),
    supabase.from('inspiration_categories').select('*').order('name', { ascending: true }),
    supabase.from('job_categories').select('*').order('name', { ascending: true }),
    supabase.from('assets_categories').select('*').order('name', { ascending: true }),
    supabase.from('site_settings').select('value').eq('key', 'logo_url').single(),
    admin.from('forum_categories').select('*').order('sort_order', { ascending: true }),
    admin.from('fonts').select('*').order('name', { ascending: true }),
    admin.from('font_weights').select('*').order('created_at', { ascending: true }),
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
  const forumCategories       = (forumCatsRes.data  ?? []) as ForumCategory[]
  const fonts                 = (fontsRes.data      ?? []) as Font[]
  const fontWeights           = (fontWeightsRes.data ?? []) as FontWeight[]

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

  async function saveFont(
    _prev: { error?: string } | null,
    formData: FormData,
  ): Promise<{ error?: string } | null> {
    'use server'
    const id   = (formData.get('id') as string) || null
    const name = (formData.get('name') as string)?.trim()
    if (!name) return { error: 'שם הפונט חסר' }
    const is_free = formData.get('is_free') === 'on'
    const tagsRaw = (formData.get('tags') as string)?.trim()
    const tags    = tagsRaw ? tagsRaw.split(',').map((t: string) => t.trim()).filter(Boolean) : []

    type WeightEntry = { weight_name: string; preview_image_url: string; download_url: string }
    let weightsData: WeightEntry[] = []
    try {
      const raw = formData.get('weights') as string
      if (raw) weightsData = JSON.parse(raw)
    } catch { /* invalid JSON — ignore */ }

    const payload = {
      name,
      name_hebrew:       (formData.get('name_hebrew')       as string) || null,
      company:           (formData.get('company')           as string) || null,
      category:          (formData.get('category')          as string) || null,
      style:             (formData.get('style')             as string) || null,
      is_free,
      price:             is_free ? null : ((formData.get('price') as string) || null),
      download_url:      (formData.get('download_url')      as string) || null,
      preview_image_url: (formData.get('preview_image_url') as string) || null,
      description:       (formData.get('description')       as string) || null,
      tags,
    }

    const a = createAdminClient()
    let fontId: string

    if (id) {
      const { error } = await a.from('fonts').update(payload).eq('id', id)
      if (error) return { error: error.message }
      fontId = id
      await a.from('font_weights').delete().eq('font_id', fontId)
    } else {
      const { data, error } = await a.from('fonts').insert(payload).select('id').single()
      if (error || !data) return { error: error?.message ?? 'שגיאה ביצירת הפונט' }
      fontId = data.id
    }

    const weightRows = weightsData
      .filter(w => w.weight_name?.trim())
      .map(w => ({
        font_id:           fontId,
        weight_name:       w.weight_name.trim(),
        preview_image_url: w.preview_image_url || null,
        download_url:      w.download_url || null,
      }))
    if (weightRows.length > 0) {
      await a.from('font_weights').insert(weightRows)
    }

    revalidatePath('/admin')
    revalidatePath('/font-identifier')
    return null
  }

  async function deleteFont(id: string): Promise<void> {
    'use server'
    await createAdminClient().from('fonts').delete().eq('id', id)
    revalidatePath('/admin')
    revalidatePath('/font-identifier')
  }

  async function getFontFileUploadUrl(
    fileName: string,
  ): Promise<{ signedUrl?: string; path?: string; error?: string }> {
    'use server'
    const a = createAdminClient()
    await a.storage.createBucket('fonts-files', { public: false }).catch(() => {})
    const ext   = fileName.split('.').pop()?.toLowerCase() ?? 'ttf'
    const path  = `font_${Date.now()}.${ext}`
    const { data, error } = await a.storage.from('fonts-files').createSignedUploadUrl(path)
    if (error) return { error: error.message }
    return { signedUrl: data.signedUrl, path }
  }

  async function generateFontPreview(
    fontId: string,
    fontFilePath: string,
  ): Promise<{ error?: string; previewUrl?: string }> {
    'use server'
    const a = createAdminClient()

    // Download font file from private storage
    const { data: blob, error: dlErr } = await a.storage
      .from('fonts-files')
      .download(fontFilePath)
    if (dlErr || !blob) return { error: dlErr?.message ?? 'שגיאה בטעינת קובץ הפונט' }

    const fontArrayBuffer = await blob.arrayBuffer()

    try {
      const satori = (await import('satori')).default
      const { createElement } = await import('react')
      const { Resvg } = await import('@resvg/resvg-js')

      const svg = await satori(
        createElement('div', {
          style: {
            display: 'flex',
            background: 'white',
            width: '100%',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px 28px',
          },
        },
          createElement('p', {
            style: {
              fontFamily: 'PreviewFont',
              fontSize: 52,
              color: '#111111',
              margin: 0,
              direction: 'rtl',
              textAlign: 'center' as const,
              letterSpacing: '0.02em',
            },
          }, 'אבגדהוזחטיכלמנסעפצקרשת'),
        ),
        {
          width: 860,
          height: 110,
          fonts: [{ name: 'PreviewFont', data: fontArrayBuffer, weight: 400, style: 'normal' as const }],
        },
      )

      const resvg  = new Resvg(svg)
      const pngBuf = Buffer.from(resvg.render().asPng())

      // Ensure fonts-previews bucket exists
      await a.storage.createBucket('fonts-previews', { public: true }).catch(() => {})

      const previewPath = `auto_${fontId}_${Date.now()}.png`
      const { error: upErr } = await a.storage
        .from('fonts-previews')
        .upload(previewPath, pngBuf, { contentType: 'image/png', upsert: true })
      if (upErr) return { error: upErr.message }

      const { data: { publicUrl } } = a.storage.from('fonts-previews').getPublicUrl(previewPath)

      await a.from('fonts').update({
        preview_image_url: publicUrl,
        font_file_path: fontFilePath,
      }).eq('id', fontId)

      revalidatePath('/admin')
      revalidatePath('/font-identifier')
      return { previewUrl: publicUrl }
    } catch (err) {
      console.error('[generateFontPreview]', err)
      return { error: 'שגיאה ביצירת תמונת preview' }
    }
  }

  async function getFontPreviewUploadUrl(): Promise<{ signedUrl?: string; publicUrl?: string; error?: string }> {
    'use server'
    const a = createAdminClient()
    // Create bucket if it doesn't exist yet (no-op if already exists)
    await a.storage.createBucket('fonts-previews', { public: true }).catch(() => {})
    const path = `font_${Date.now()}.jpg`
    const { data, error } = await a.storage.from('fonts-previews').createSignedUploadUrl(path)
    if (error) return { error: error.message }
    const { data: { publicUrl } } = a.storage.from('fonts-previews').getPublicUrl(path)
    return { signedUrl: data.signedUrl, publicUrl }
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
      forumCategories={forumCategories}
      addForumCategory={addForumCategory}
      deleteForumCategory={deleteForumCategory}
      fonts={fonts}
      fontWeights={fontWeights}
      saveFont={saveFont}
      deleteFont={deleteFont}
      getFontPreviewUploadUrl={getFontPreviewUploadUrl}
      getFontFileUploadUrl={getFontFileUploadUrl}
      generateFontPreview={generateFontPreview}
    />
  )
}

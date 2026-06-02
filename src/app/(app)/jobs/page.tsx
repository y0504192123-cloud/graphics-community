import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import JobsClient from './JobsClient'
import type { Job, Profile } from '@/types'

export default async function JobsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const [jobsRes, catsRes, profileRes] = await Promise.all([
    admin.from('jobs').select('*, profiles!client_id(*)').order('created_at', { ascending: false }),
    admin.from('job_categories').select('name').order('name', { ascending: true }),
    admin.from('profiles').select('role').eq('id', user.id).single(),
  ])

  if (jobsRes.error) console.error('[JobsPage] jobs fetch error:', jobsRes.error.message)
  if (catsRes.error) console.error('[JobsPage] categories fetch error:', catsRes.error.message)
  console.log('[JobsPage] jobs count:', jobsRes.data?.length ?? 0)

  const isAdmin = profileRes.data?.role === 'admin'
  const categories: string[] = (catsRes.data ?? []).map((c) => c.name)

  async function createJob(formData: FormData) {
    'use server'
    console.log('[createJob] called')
    try {
      const supabase = await createClient()
      const { data: { user }, error: authErr } = await supabase.auth.getUser()
      console.log('[createJob] user:', user?.id ?? null, 'authErr:', authErr?.message ?? null)
      if (!user) { console.error('[createJob] no user'); redirect('/login') }

      const title = formData.get('title') as string
      const description = formData.get('description') as string
      const category = (formData.get('category') as string) || null
      const budgetMinStr = formData.get('budget_min') as string
      const budgetMaxStr = formData.get('budget_max') as string
      const deadline = (formData.get('deadline') as string) || null
      const budget_min = budgetMinStr ? Number(budgetMinStr) : null
      const budget_max = budgetMaxStr ? Number(budgetMaxStr) : null
      console.log('[createJob] payload:', { title, description, category, budget_min, budget_max, deadline })

      const { error, data } = await createAdminClient().from('jobs').insert({
        client_id: user!.id,
        title,
        description,
        category,
        budget_min,
        budget_max,
        deadline,
        status: 'open',
      }).select()
      console.log('[createJob] insert result — data:', JSON.stringify(data), 'error:', error?.message ?? 'none')

      revalidatePath('/jobs')
      console.log('[createJob] revalidated')
    } catch (err) {
      console.error('[createJob] unexpected error:', err)
    }
  }

  async function applyToJob(jobId: string, formData: FormData) {
    'use server'
    console.log('[applyToJob] called for job:', jobId)
    try {
      const supabase = await createClient()
      const { data: { user }, error: authErr } = await supabase.auth.getUser()
      console.log('[applyToJob] user:', user?.id ?? null, 'authErr:', authErr?.message ?? null)
      if (!user) { redirect('/login') }

      const priceStr = formData.get('price') as string
      const { error } = await createAdminClient().from('proposals').insert({
        job_id: jobId,
        user_id: user!.id,
        content: formData.get('content') as string,
        price: priceStr ? Number(priceStr) : null,
        status: 'pending',
      })
      console.log('[applyToJob] insert error:', error?.message ?? 'none')

      revalidatePath('/jobs')
    } catch (err) {
      console.error('[applyToJob] unexpected error:', err)
    }
  }

  async function changeJobStatus(jobId: string, status: string) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await createAdminClient()
      .from('jobs')
      .update({ status })
      .eq('id', jobId)
      .eq('client_id', user.id)
    if (error) console.error('[changeJobStatus] error:', error.message)
    revalidatePath('/jobs')
  }

  async function deleteJob(jobId: string) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const profile = await createAdminClient().from('profiles').select('role').eq('id', user.id).single()
    const isAdmin = profile.data?.role === 'admin'
    const query = createAdminClient().from('jobs').delete().eq('id', jobId)
    if (!isAdmin) query.eq('client_id', user.id)
    const { error } = await query
    if (error) console.error('[deleteJob] error:', error.message)
    revalidatePath('/jobs')
  }

  return (
    <JobsClient
      jobs={(jobsRes.data ?? []) as (Job & { profiles: Profile | null })[]}
      currentUserId={user.id}
      isAdmin={isAdmin}
      categories={categories}
      createJob={createJob}
      applyToJob={applyToJob}
      changeJobStatus={changeJobStatus}
      deleteJob={deleteJob}
    />
  )
}

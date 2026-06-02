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
  const [jobsRes, catsRes] = await Promise.all([
    admin.from('jobs').select('*, profiles!client_id(*)').order('created_at', { ascending: false }),
    admin.from('job_categories').select('name').order('name', { ascending: true }),
  ])

  if (jobsRes.error) console.error('[JobsPage] jobs fetch error:', jobsRes.error.message)
  if (catsRes.error) console.error('[JobsPage] categories fetch error:', catsRes.error.message)
  console.log('[JobsPage] jobs count:', jobsRes.data?.length ?? 0)

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
      const budgetStr = formData.get('budget') as string
      const budget = budgetStr ? Number(budgetStr) : null
      console.log('[createJob] payload:', { title, description, category, budget })

      const { error, data } = await createAdminClient().from('jobs').insert({
        client_id: user!.id,
        title,
        description,
        category,
        budget,
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

  return (
    <JobsClient
      jobs={(jobsRes.data ?? []) as (Job & { profiles: Profile | null })[]}
      currentUserId={user.id}
      categories={categories}
      createJob={createJob}
      applyToJob={applyToJob}
    />
  )
}

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import JobsClient from './JobsClient'
import type { Job, Profile } from '@/types'

export default async function JobsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [jobsRes, catsRes] = await Promise.all([
    supabase.from('jobs').select('*, profiles(*)').order('created_at', { ascending: false }),
    supabase.from('job_categories').select('name').order('name', { ascending: true }),
  ])

  const categories: string[] = (catsRes.data ?? []).map((c) => c.name)

  async function createJob(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const budgetStr = formData.get('budget') as string
    await supabase.from('jobs').insert({
      user_id: user.id,
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      category: (formData.get('category') as string) || null,
      budget: budgetStr ? Number(budgetStr) : null,
      status: 'open',
    })

    revalidatePath('/jobs')
  }

  async function applyToJob(jobId: string, formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const priceStr = formData.get('price') as string
    await supabase.from('proposals').insert({
      job_id: jobId,
      user_id: user.id,
      content: formData.get('content') as string,
      price: priceStr ? Number(priceStr) : null,
      status: 'pending',
    })

    revalidatePath('/jobs')
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

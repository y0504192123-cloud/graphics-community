'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendAdminNewUserEmail } from '@/lib/mail'

export type AuthState = { error?: string; message?: string } | null

export async function signIn(prevState: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })
  if (error) return { error: error.message }

  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('status, role')
      .eq('id', user.id)
      .maybeSingle()

    // Admin: unconditional pass-through — checked BEFORE anything else
    if (profile?.role === 'admin') {
      redirect('/dashboard')
    }

    // Only block when status is EXPLICITLY non-active.
    // null profile (RLS issue / first-time) → proceed, layout handles it.
    if (profile?.status === 'pending') {
      await supabase.auth.signOut()
      return { error: 'pending' }
    }
    if (profile?.status === 'rejected') {
      await supabase.auth.signOut()
      return { error: 'rejected' }
    }
  }

  redirect('/dashboard')
}

export async function signUp(prevState: AuthState, formData: FormData): Promise<AuthState> {
  const agreedToTerms = formData.get('agreed_to_terms') === 'on'
  if (!agreedToTerms) return { error: 'יש להסכים לתנאי השימוש ולמדיניות הפרטיות כדי להמשיך' }

  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { data: authData, error } = await supabase.auth.signUp({ email, password })
  if (error) return { error: error.message }
  if (!authData.user) return { error: 'שגיאה ביצירת החשבון' }

  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? headersList.get('x-real-ip')
    ?? null

  const adminSupabase = createAdminClient()
  const yearsRaw = formData.get('years_experience') as string
  const { error: profileError } = await adminSupabase.from('profiles').upsert({
    id: authData.user.id,
    email,
    username: email.split('@')[0],
    full_name: (formData.get('full_name') as string)?.trim() || null,
    city: (formData.get('city') as string)?.trim() || null,
    years_experience: yearsRaw ? parseInt(yearsRaw) : null,
    portfolio_url: (formData.get('portfolio_url') as string)?.trim() || null,
    phone: (formData.get('phone') as string)?.trim() || null,
    status: 'pending',
    agreed_to_terms: true,
    agreed_at: new Date().toISOString(),
    agreed_ip: ip,
  })

  if (profileError) {
    // Roll back the auth user so they can retry registration
    await adminSupabase.auth.admin.deleteUser(authData.user.id)
    return { error: `שגיאה ביצירת הפרופיל: ${profileError.message}` }
  }

  // Fire-and-forget — don't block signup if mail fails
  sendAdminNewUserEmail({
    fullName: (formData.get('full_name') as string)?.trim() || null,
    email,
    city: (formData.get('city') as string)?.trim() || null,
    yearsExperience: yearsRaw ? parseInt(yearsRaw) : null,
    registeredAt: new Date().toISOString(),
  }).catch((err) => console.error('[mail] failed to send admin notification:', err))

  await supabase.auth.signOut()
  return { message: 'pending' }
}

export async function sendPasswordReset(prevState: AuthState, formData: FormData): Promise<AuthState> {
  const email = (formData.get('email') as string)?.trim()
  if (!email) return { error: 'נא להזין כתובת אימייל' }

  const headersList = await headers()
  const host = headersList.get('host') ?? 'localhost:3000'
  const proto = headersList.get('x-forwarded-proto') ?? (process.env.NODE_ENV === 'production' ? 'https' : 'http')
  const origin = `${proto}://${host}`

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/api/auth/callback?next=/reset-password`,
  })

  if (error) return { error: error.message }
  return { message: 'reset_sent' }
}

export async function signInWithGoogle(): Promise<AuthState> {
  const headersList = await headers()
  const host = headersList.get('host') ?? 'localhost:3000'
  const proto = headersList.get('x-forwarded-proto') ?? (process.env.NODE_ENV === 'production' ? 'https' : 'http')
  const origin = `${proto}://${host}`

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${origin}/api/auth/callback` },
  })
  if (error) return { error: error.message }
  if (data.url) redirect(data.url)
  return { error: 'לא ניתן היה להתחבר עם Google' }
}

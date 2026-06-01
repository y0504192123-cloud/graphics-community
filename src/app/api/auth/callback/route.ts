import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('status, role')
          .eq('id', user.id)
          .single()

        if (!existingProfile) {
          // Attempt insert for genuinely new Google users (no-op on conflict)
          await supabase.from('profiles').insert({
            id: user.id,
            email: user.email ?? null,
            full_name: user.user_metadata?.full_name ?? null,
            avatar_url: user.user_metadata?.avatar_url ?? null,
            status: 'pending',
          })
          await supabase.auth.signOut()
          // No ?message=pending so admins with an RLS-unreadable profile don't see the wrong banner.
          return NextResponse.redirect(`${origin}/login`)
        }

        // Admins always get in regardless of status
        if (existingProfile.role !== 'admin') {
          if (existingProfile.status === 'pending') {
            await supabase.auth.signOut()
            return NextResponse.redirect(`${origin}/login?message=pending`)
          }
          if (existingProfile.status === 'rejected') {
            await supabase.auth.signOut()
            return NextResponse.redirect(`${origin}/login?message=rejected`)
          }
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}

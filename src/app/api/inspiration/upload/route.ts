import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })

  const admin = createAdminClient()
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const fileName = `${user.id}/${Date.now()}.${ext}`
  const bytes = await file.arrayBuffer()

  const { data: uploadData, error: uploadError } = await admin.storage
    .from('portfolio')
    .upload(fileName, Buffer.from(bytes), { contentType: file.type, upsert: false })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = admin.storage.from('portfolio').getPublicUrl(uploadData.path)
  return NextResponse.json({ url: publicUrl })
}

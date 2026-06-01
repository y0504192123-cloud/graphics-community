import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    console.log('[upload-route] user:', user?.id ?? null, 'authErr:', authErr?.message ?? null)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let formData: FormData
    try {
      formData = await request.formData()
    } catch (e) {
      console.error('[upload-route] formData parse error:', e)
      return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
    }

    const file = formData.get('file') as File | null
    console.log('[upload-route] file:', file?.name ?? 'null', 'size:', file?.size ?? 0)
    if (!file || file.size === 0) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })

    const admin = createAdminClient()
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const fileName = `${user.id}/${Date.now()}.${ext}`
    console.log('[upload-route] uploading to bucket "portfolio", path:', fileName)

    const bytes = await file.arrayBuffer()
    const { data: uploadData, error: uploadError } = await admin.storage
      .from('portfolio')
      .upload(fileName, Buffer.from(bytes), { contentType: file.type, upsert: false })

    console.log('[upload-route] upload result — data:', uploadData?.path ?? null, 'error:', uploadError?.message ?? null)
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

    const { data: { publicUrl } } = admin.storage.from('portfolio').getPublicUrl(uploadData.path)
    console.log('[upload-route] publicUrl:', publicUrl)
    return NextResponse.json({ url: publicUrl })
  } catch (err) {
    console.error('[upload-route] unexpected error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

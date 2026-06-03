'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function identifyFontFromDB(
  imageBase64: string,
  imageMimeType: string,
): Promise<{ matches?: string[]; scores?: number[]; confident?: boolean; description?: string; error?: string; debug?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const dbg: string[] = []

  try {
    const { computeImageEmbedding } = await import('@/lib/clip-embeddings')
    const imageBuffer = Buffer.from(imageBase64, 'base64')
    dbg.push(`Image size: ${imageBuffer.length} bytes, type: ${imageMimeType}`)
    dbg.push('Loading CLIP model and computing embedding...')

    const embedding = await computeImageEmbedding(imageBuffer)
    dbg.push(`Embedding: ${embedding.length} dims, first 4: [${embedding.slice(0, 4).map(v => v.toFixed(4)).join(', ')}]`)

    const admin = createAdminClient()
    const { data, error } = await admin.rpc('match_fonts', {
      query_embedding: embedding,
      match_count: 5,
    })

    if (error) {
      dbg.push(`RPC error: ${error.message}`)
      return { error: `שגיאת DB: ${error.message}`, debug: dbg.join('\n') }
    }

    type MatchRow = { id: string; name: string; preview_image_url: string; similarity: number }
    const results = (data ?? []) as MatchRow[]

    if (results.length === 0) {
      dbg.push('No results — embeddings not computed yet')
      return {
        error: 'לא נמצאו פונטים עם embeddings — לחץ "חשב embeddings" בפאנל הניהול',
        debug: dbg.join('\n'),
      }
    }

    dbg.push(`\nResults:`)
    results.forEach(r => dbg.push(`  ${r.name}: ${(r.similarity * 100).toFixed(1)}%`))

    const topScore  = results[0].similarity
    const confident = topScore >= 0.72

    // Deduplicate by base name (strip trailing version markers)
    const baseName = (s: string) => s.replace(/\s+(v\d+|\d+|II|III|IV)$/i, '').trim().toLowerCase()
    const seen = new Map<string, MatchRow>()
    for (const r of results) {
      const key = baseName(r.name)
      const existing = seen.get(key)
      if (!existing || r.similarity > existing.similarity) seen.set(key, r)
    }
    const deduped = [...seen.values()].sort((a, b) => b.similarity - a.similarity).slice(0, 3)

    dbg.push(`\nAfter dedup (${deduped.length}): ${deduped.map(r => r.name).join(', ')}`)
    dbg.push(`Top score: ${(topScore * 100).toFixed(1)}%, confident: ${confident}`)

    return {
      matches:     deduped.map(r => r.name),
      scores:      deduped.map(r => Math.round(r.similarity * 100)),
      confident,
      description: confident
        ? `זוהה בביטחון (${Math.round(topScore * 100)}%)`
        : `הפונטים הדומים ביותר (${Math.round(topScore * 100)}% — לא בטוח)`,
      debug: dbg.join('\n'),
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    dbg.push(`Error: ${msg}`)
    console.error('[font-id] error:', err)
    return { error: `שגיאה: ${msg}`, debug: dbg.join('\n') }
  }
}

// ── Diagnostic: check preview URL health ─────────────────────────────────────
export async function checkPreviewHealth(): Promise<{
  total: number; withUrl: number; withoutUrl: number
  sampleUrls: { name: string; url: string | null }[]
  httpChecks: { name: string; url: string; status: number | string }[]
}> {
  'use server'
  const admin = createAdminClient()
  const { data } = await admin.from('fonts').select('id, name, preview_image_url').order('name', { ascending: true })
  const fonts = data ?? []
  const withUrl    = fonts.filter((f: { preview_image_url: string | null }) => f.preview_image_url)
  const withoutUrl = fonts.filter((f: { preview_image_url: string | null }) => !f.preview_image_url)

  const httpChecks = await Promise.all(
    withUrl.slice(0, 5).map(async (f: { name: string; preview_image_url: string | null }) => {
      try {
        const r = await fetch(f.preview_image_url!, { method: 'HEAD', signal: AbortSignal.timeout(5000) })
        return { name: f.name, url: f.preview_image_url!, status: r.status }
      } catch (e) {
        return { name: f.name, url: f.preview_image_url!, status: String(e) }
      }
    })
  )

  return {
    total: fonts.length,
    withUrl: withUrl.length,
    withoutUrl: withoutUrl.length,
    sampleUrls: withUrl.slice(0, 5).map((f: { name: string; preview_image_url: string | null }) => ({ name: f.name, url: f.preview_image_url })),
    httpChecks,
  }
}

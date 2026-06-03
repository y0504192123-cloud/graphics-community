'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Font } from '@/types'

// ── Constants ─────────────────────────────────────────────────────────────────
const BATCH_SIZE   = 20
const BATCH_CONCUR = 5
const DL_CONCUR    = 40

type Preview = { name: string; base64: string; mimeType: string }

// ── Helpers ───────────────────────────────────────────────────────────────────

async function downloadPreview(font: Font): Promise<Preview | null> {
  if (!font.preview_image_url) return null
  try {
    const r = await fetch(font.preview_image_url, { signal: AbortSignal.timeout(8000) })
    if (!r.ok) return null
    const buf = await r.arrayBuffer()
    return {
      name: font.name,
      base64: Buffer.from(buf).toString('base64'),
      mimeType: (r.headers.get('content-type') ?? 'image/png').split(';')[0].trim(),
    }
  } catch { return null }
}

async function runConcurrent<T>(fns: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = []
  for (let i = 0; i < fns.length; i += limit) {
    results.push(...await Promise.all(fns.slice(i, i + limit).map(f => f())))
  }
  return results
}

async function claudeCall(apiKey: string, model: string, maxTokens: number, content: object[]): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: 'user', content }] }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message ?? 'Claude API error')
  return data.content?.[0]?.text ?? ''
}

const imgBlock  = (b64: string, mime: string) =>
  ({ type: 'image'  as const, source: { type: 'base64' as const, media_type: mime, data: b64 } })
const textBlock = (text: string) =>
  ({ type: 'text' as const, text })

function resolveMatch(claudeName: string, fontNames: string[]): string | null {
  if (!claudeName || claudeName.toUpperCase() === 'NONE') return null
  if (fontNames.includes(claudeName)) return claudeName
  const norm = (s: string) => s.toLowerCase().replace(/[\s_-]/g, '')
  const target = norm(claudeName)
  return fontNames.find(n => norm(n) === target) ?? null
}

function buildDescription(serif: boolean, construction: string): string {
  return `פונט ${serif ? 'סריף' : 'סאן-סריף'}${construction ? ` · ${construction}` : ''}`
}

function dedupeByBase(entries: { name: string; score: number }[]) {
  const norm = (s: string) => s.replace(/\s+(v\d+|\d+|II|III|IV)$/i, '').trim().toLowerCase()
  const seen = new Map<string, { name: string; score: number }>()
  for (const e of entries) {
    const key = norm(e.name)
    const existing = seen.get(key)
    if (!existing || e.score > existing.score) seen.set(key, e)
  }
  return [...seen.values()].sort((a, b) => b.score - a.score)
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function identifyFontFromDB(
  imageBase64: string,
  imageMimeType: string,
  userEmbedding?: number[],
): Promise<{ matches?: string[]; scores?: number[]; confident?: boolean; description?: string; error?: string; debug?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return { error: 'ANTHROPIC_API_KEY חסר בהגדרות השרת' }

  const dbg: string[] = []

  // ── Path A: embedding-based (fast) ───────────────────────────────────────────
  if (userEmbedding?.length) {
    return identifyWithEmbedding(imageBase64, imageMimeType, userEmbedding, apiKey, dbg)
  }

  // ── Path B: tournament fallback ───────────────────────────────────────────────
  dbg.push('No embedding provided — using tournament fallback')
  return identifyWithTournament(imageBase64, imageMimeType, apiKey, dbg)
}

// ── Path A: query top-20 by cosine similarity, Claude picks ──────────────────

async function identifyWithEmbedding(
  imageBase64: string,
  imageMimeType: string,
  userEmbedding: number[],
  apiKey: string,
  dbg: string[],
) {
  dbg.push(`Embedding path: ${userEmbedding.length} dims`)
  const admin = createAdminClient()

  const { data, error } = await admin.rpc('match_fonts', {
    query_embedding: userEmbedding,
    match_count: 20,
  })

  if (error) {
    dbg.push(`RPC error: ${error.message} — falling back to tournament`)
    return identifyWithTournament(imageBase64, imageMimeType, apiKey, dbg)
  }

  type Row = { id: string; name: string; preview_image_url: string; similarity: number }
  const candidates = (data ?? []) as Row[]
  dbg.push(`Top candidates: ${candidates.map(r => `${r.name}(${(r.similarity * 100).toFixed(0)}%)`).join(', ')}`)

  if (candidates.length === 0) {
    dbg.push('No embeddings in DB yet — falling back to tournament')
    return identifyWithTournament(imageBase64, imageMimeType, apiKey, dbg)
  }

  // Download candidate previews
  const previews = (await Promise.all(
    candidates.map(r => downloadPreview(r as unknown as Font))
  )).filter(Boolean) as Preview[]
  dbg.push(`Downloaded ${previews.length}/${candidates.length} previews`)

  if (previews.length === 0) return { error: 'לא ניתן לטעון תמונות preview.', debug: dbg.join('\n') }

  const allNames     = previews.map(p => p.name)
  const imageLines   = previews.map((p, i) => `  Image ${i + 2}: "${p.name}"`).join('\n')
  const nameLines    = previews.map((p, i) => `${i + 1}. ${p.name}`).join('\n')

  const prompt = `You are a Hebrew font identification expert.

Image 1: user's image (unknown font).
${imageLines}

These ${previews.length} fonts were pre-selected as the most visually similar by AI embedding similarity.

CRITICAL: Focus ONLY on letterform shapes — completely ignore stroke thickness.
A Light and Bold of the same typeface have IDENTICAL shapes and must score equally.
Compare: letter skeleton, curves, angles, terminals, counter shapes (ע מ כ ר ש ק א ת).

Font names (copy exactly):
${nameLines}

Reply ONLY in this format:
DESCRIPTION: one sentence in Hebrew about the font style (shape, not weight)
MATCH: ExactFontName (SCORE: 85)
MATCH: ExactFontName (SCORE: 60)
MATCH: ExactFontName (SCORE: 30)

SCORE is 0-100 shape similarity. Up to 3 MATCH lines.`

  try {
    const content = [
      imgBlock(imageBase64, imageMimeType),
      ...previews.map(p => imgBlock(p.base64, p.mimeType)),
      textBlock(prompt),
    ]
    const text = await claudeCall(apiKey, 'claude-sonnet-4-6', 300, content)
    dbg.push(`\nClaude response:\n${text}`)

    const description = text.match(/DESCRIPTION:\s*(.+)/i)?.[1]?.trim() ?? ''

    type E = { name: string; score: number }
    const entries: E[] = []
    for (const line of (text.match(/MATCH:\s*.+/gi) ?? [])) {
      const scoreMatch = line.match(/\(SCORE:\s*(\d+)\)/i)
      const score      = scoreMatch ? Math.min(100, Math.max(0, parseInt(scoreMatch[1]))) : 0
      const rawName    = line.replace(/^MATCH:\s*/i, '').replace(/\s*\(SCORE:\s*\d+\)/i, '').trim()
      const resolved   = resolveMatch(rawName, allNames)
      if (resolved && !entries.find(e => e.name === resolved)) entries.push({ name: resolved, score })
    }

    if (entries.length === 0) candidates.slice(0, 3).forEach(r => entries.push({ name: r.name, score: 0 }))

    const top       = dedupeByBase(entries).slice(0, 3)
    const topScore  = top[0]?.score ?? 0
    const confident = topScore >= 70

    dbg.push(`\nFinal: ${JSON.stringify(top)}, confident: ${confident}`)
    return { description, matches: top.map(e => e.name), scores: top.map(e => e.score), confident, debug: dbg.join('\n') }
  } catch (err) {
    dbg.push(`Claude error: ${err}`)
    return { error: `שגיאה: ${err}`, debug: dbg.join('\n') }
  }
}

// ── Path B: full tournament (fallback when no embeddings) ─────────────────────

async function identifyWithTournament(
  imageBase64: string,
  imageMimeType: string,
  apiKey: string,
  dbg: string[],
) {
  const admin = createAdminClient()
  const { data: fontsData } = await admin
    .from('fonts')
    .select('id, name, preview_image_url')
    .not('preview_image_url', 'is', null)
    .order('name', { ascending: true })
  const fonts = (fontsData ?? []) as Font[]
  dbg.push(`Tournament: ${fonts.length} fonts`)
  if (!fonts.length) return { error: 'אין פונטים עם preview במאגר.', debug: dbg.join('\n') }

  // Step 1: visual analysis
  const step1Prompt = `You are a Hebrew typography expert. Analyze the SHAPE of the letterforms — ignore stroke weight.

Reply ONLY in this exact format:
SERIF: yes | no
TERMINALS: sharp | rounded | flat | wedge
CONSTRUCTION: geometric | humanist | calligraphic | grotesque
DISTINCTIVE: describe unique letter shapes — curves, angles, counters, proportions`

  let analysis: string
  try {
    analysis = await claudeCall(apiKey, 'claude-haiku-4-5-20251001', 120,
      [imgBlock(imageBase64, imageMimeType), textBlock(step1Prompt)])
    dbg.push(`\nStep 1:\n${analysis}`)
  } catch (err) {
    return { error: 'שגיאה בניתוח התמונה', debug: dbg.join('\n') }
  }

  const serif = analysis.match(/SERIF:\s*(\w+)/i)?.[1]?.toLowerCase() === 'yes'
  const construction = analysis.match(/CONSTRUCTION:\s*(\w+)/i)?.[1] ?? ''

  // Download all previews
  const t0 = Date.now()
  const allPreviews = (await runConcurrent(fonts.map(f => () => downloadPreview(f)), DL_CONCUR))
    .filter(Boolean) as Preview[]
  dbg.push(`Downloads: ${allPreviews.length}/${fonts.length} OK in ${Date.now() - t0}ms`)
  if (!allPreviews.length) return { error: 'לא ניתן לטעון תמונות preview.', debug: dbg.join('\n') }

  const allFontNames = allPreviews.map(p => p.name)

  // Step 2: batched tournament
  const batches: Preview[][] = []
  for (let i = 0; i < allPreviews.length; i += BATCH_SIZE) batches.push(allPreviews.slice(i, i + BATCH_SIZE))
  dbg.push(`\nStep 2: ${batches.length} batches × ${BATCH_SIZE}`)

  const batchTasks = batches.map((batch, batchIdx) => async (): Promise<string | null> => {
    const imageLines = batch.map((p, i) => `  Image ${i + 2}: "${p.name}"`).join('\n')
    const nameLines  = batch.map((p, i) => `${i + 1}. ${p.name}`).join('\n')
    const prompt = `Hebrew font identification.
Image 1: unknown font. ${imageLines}
Target shape (IGNORE weight): ${analysis}
IGNORE stroke thickness — Light/Bold of same family = IDENTICAL shapes.
Focus on: skeleton, curves, terminals, counter shapes (ע מ כ ר ש ק א).
${nameLines}
Reply ONE line: BEST: ExactFontName  (or BEST: NONE)`
    try {
      const text     = await claudeCall(apiKey, 'claude-haiku-4-5-20251001', 40, [
        imgBlock(imageBase64, imageMimeType),
        ...batch.map(p => imgBlock(p.base64, p.mimeType)),
        textBlock(prompt),
      ])
      const parsed   = text.match(/BEST:\s*(.+)/i)?.[1]?.trim() ?? ''
      const resolved = resolveMatch(parsed, allFontNames)
      dbg.push(`  batch ${batchIdx + 1}: "${text.trim()}" → ${resolved ?? 'NONE'}`)
      return resolved
    } catch { return null }
  })

  const rawWinners = await runConcurrent(batchTasks, BATCH_CONCUR)
  const winners    = [...new Set(rawWinners.filter(Boolean) as string[])]
  dbg.push(`\nFinalists (${winners.length}): ${winners.join(', ')}`)

  if (winners.length === 0) {
    return {
      description: buildDescription(serif, construction),
      matches: allPreviews.slice(0, 3).map(p => p.name),
      scores: [0, 0, 0],
      confident: false,
      debug: dbg.join('\n'),
    }
  }

  // Step 3: Sonnet final
  const finalWinners  = winners.slice(0, 20)
  const winnerPreviews = finalWinners.map(name => allPreviews.find(p => p.name === name)).filter(Boolean) as Preview[]
  const winnerImgLines = winnerPreviews.map((p, i) => `  Image ${i + 2}: "${p.name}"`).join('\n')
  const winnerNameLines = winnerPreviews.map((p, i) => `${i + 1}. ${p.name}`).join('\n')

  const finalPrompt = `Hebrew font identification expert — final selection.
Image 1: unknown font. ${winnerImgLines}
Target shape: ${analysis}
CRITICAL: shapes only, ignore stroke weight. Light/Bold of same family = score equally.
${winnerNameLines}
Reply ONLY:
DESCRIPTION: one Hebrew sentence about font style
MATCH: ExactFontName (SCORE: 85)
MATCH: ExactFontName (SCORE: 60)
MATCH: ExactFontName (SCORE: 30)
SCORE 0-100 shape similarity. Up to 3 MATCH lines.`

  try {
    const text = await claudeCall(apiKey, 'claude-sonnet-4-6', 300, [
      imgBlock(imageBase64, imageMimeType),
      ...winnerPreviews.map(p => imgBlock(p.base64, p.mimeType)),
      textBlock(finalPrompt),
    ])
    dbg.push(`\nStep 3:\n${text}`)

    const description = text.match(/DESCRIPTION:\s*(.+)/i)?.[1]?.trim() ?? buildDescription(serif, construction)
    type E = { name: string; score: number }
    const entries: E[] = []
    for (const line of (text.match(/MATCH:\s*.+/gi) ?? [])) {
      const scoreMatch = line.match(/\(SCORE:\s*(\d+)\)/i)
      const score      = scoreMatch ? Math.min(100, Math.max(0, parseInt(scoreMatch[1]))) : 0
      const rawName    = line.replace(/^MATCH:\s*/i, '').replace(/\s*\(SCORE:\s*\d+\)/i, '').trim()
      const resolved   = resolveMatch(rawName, allFontNames)
      if (resolved && !entries.find(e => e.name === resolved)) entries.push({ name: resolved, score })
    }
    if (entries.length === 0) finalWinners.slice(0, 3).forEach(n => entries.push({ name: n, score: 0 }))

    const top      = dedupeByBase(entries).slice(0, 3)
    const topScore = top[0]?.score ?? 0
    dbg.push(`\nFinal: ${JSON.stringify(top)}`)
    return { description, matches: top.map(e => e.name), scores: top.map(e => e.score), confident: topScore >= 70, debug: dbg.join('\n') }
  } catch (err) {
    dbg.push(`Step 3 failed: ${err}`)
    return { description: buildDescription(serif, construction), matches: finalWinners.slice(0, 3), scores: finalWinners.slice(0, 3).map(() => 0), confident: false, debug: dbg.join('\n') }
  }
}

// ── Letter segmentation + letter-based identification ────────────────────────

export async function segmentLettersFromImage(
  imageBase64: string,
): Promise<{ letters?: string[]; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  try {
    const buf = Buffer.from(imageBase64, 'base64')
    const { segmentLetters } = await import('@/lib/letter-segment')
    const letterBufs = await segmentLetters(buf)
    return { letters: letterBufs.map(b => b.toString('base64')) }
  } catch (err) {
    return { error: String(err) }
  }
}

export async function identifyByLetterEmbeddings(
  letterEmbeddings: number[][],
  imageBase64: string,
  imageMimeType: string,
): Promise<{ matches?: string[]; scores?: number[]; confident?: boolean; description?: string; error?: string; debug?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  if (!letterEmbeddings.length) return { error: 'לא סופקו embeddings' }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return { error: 'ANTHROPIC_API_KEY חסר' }

  const dbg: string[] = []
  dbg.push(`Letter-based identification: ${letterEmbeddings.length} letter embeddings`)

  const dim = letterEmbeddings[0].length
  const centroid = new Array(dim).fill(0) as number[]
  for (const emb of letterEmbeddings) {
    for (let i = 0; i < dim; i++) centroid[i] += emb[i]
  }
  for (let i = 0; i < dim; i++) centroid[i] /= letterEmbeddings.length
  const norm = Math.sqrt(centroid.reduce((s, v) => s + v * v, 0))
  const normalized = norm > 0 ? centroid.map(v => v / norm) : centroid

  dbg.push('Centroid of letter embeddings → DB query')
  return identifyWithEmbedding(imageBase64, imageMimeType, normalized, apiKey, dbg)
}

// ── Diagnostic ────────────────────────────────────────────────────────────────
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
    total: fonts.length, withUrl: withUrl.length, withoutUrl: withoutUrl.length,
    sampleUrls: withUrl.slice(0, 5).map((f: { name: string; preview_image_url: string | null }) => ({ name: f.name, url: f.preview_image_url })),
    httpChecks,
  }
}

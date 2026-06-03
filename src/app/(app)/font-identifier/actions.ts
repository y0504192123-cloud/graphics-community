'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Font } from '@/types'

const BATCH_SIZE    = 20   // font previews per Claude call (safe image limit)
const BATCH_CONCUR  = 5    // parallel Claude calls at once
const DL_CONCUR     = 40   // parallel preview downloads at once

type Preview = { name: string; base64: string; mimeType: string }

// ── Helpers ───────────────────────────────────────────────────────────────────

async function downloadPreview(font: Font): Promise<Preview | null> {
  if (!font.preview_image_url) return null
  try {
    const r = await fetch(font.preview_image_url, { signal: AbortSignal.timeout(8000) })
    if (!r.ok) return null
    const buf = await r.arrayBuffer()
    const base64 = Buffer.from(buf).toString('base64')
    const ct = r.headers.get('content-type') ?? 'image/png'
    return { name: font.name, base64, mimeType: ct.split(';')[0].trim() }
  } catch { return null }
}

async function runConcurrent<T>(fns: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = []
  for (let i = 0; i < fns.length; i += limit) {
    const chunk = await Promise.all(fns.slice(i, i + limit).map(f => f()))
    results.push(...chunk)
  }
  return results
}

async function claudeCall(
  apiKey: string,
  model: string,
  maxTokens: number,
  content: object[],
): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: 'user', content }] }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message ?? 'Claude API error')
  return data.content?.[0]?.text ?? ''
}

function imgBlock(base64: string, mimeType: string) {
  return { type: 'image' as const, source: { type: 'base64' as const, media_type: mimeType, data: base64 } }
}

function textBlock(text: string) {
  return { type: 'text' as const, text }
}

// ── Main action ───────────────────────────────────────────────────────────────

export async function identifyFontFromDB(
  imageBase64: string,
  imageMimeType: string,
): Promise<{ matches?: string[]; description?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return { error: 'ANTHROPIC_API_KEY חסר בהגדרות השרת' }

  const admin = createAdminClient()
  const { data: fontsData } = await admin
    .from('fonts')
    .select('id, name, preview_image_url')
    .not('preview_image_url', 'is', null)
    .order('name', { ascending: true })

  const fonts = (fontsData ?? []) as Font[]
  console.log(`[font-id] DB: ${fonts.length} fonts with non-null preview_image_url`)
  // Log first 3 URLs so we can verify they look correct
  fonts.slice(0, 3).forEach(f => console.log(`[font-id] sample URL: "${f.name}" → ${f.preview_image_url}`))
  if (!fonts.length) return { error: 'אין פונטים עם תמונות preview במאגר.' }

  // ── Step 1: Detailed visual analysis ────────────────────────────────────────
  const step1Prompt = `You are a Hebrew typography expert. Analyze the letterform characteristics of the font in this image.

Reply ONLY in this exact format (one value per line):
SERIF: yes | no
WEIGHT: thin | light | regular | medium | bold | black
WIDTH: condensed | normal | wide
TERMINALS: rounded | sharp | square
XHEIGHT: low | medium | high
FEATURES: 2-3 distinctive visual traits (e.g. "high stroke contrast, triangular serifs, open counters")`

  let analysis: string
  try {
    analysis = await claudeCall(apiKey, 'claude-haiku-4-5-20251001', 120,
      [imgBlock(imageBase64, imageMimeType), textBlock(step1Prompt)])
    console.log(`[font-id] step-1:\n${analysis}`)
  } catch (err) {
    console.error('[font-id] step-1 failed:', err)
    return { error: 'שגיאה בניתוח התמונה' }
  }

  // ── Download all previews in parallel ────────────────────────────────────────
  const t0 = Date.now()
  const dlTasks = fonts.map(f => () => downloadPreview(f))
  const downloaded = await runConcurrent(dlTasks, DL_CONCUR)
  const allPreviews = downloaded.filter(Boolean) as Preview[]
  const failed = downloaded.filter(x => x === null).length
  console.log(`[font-id] downloads: ${allPreviews.length} OK, ${failed} failed — ${Date.now() - t0}ms`)
  if (failed > 0) {
    // Log which fonts failed to download
    const failedNames = fonts.filter((_, i) => downloaded[i] === null).slice(0, 5).map(f => f.name)
    console.log(`[font-id] failed downloads (first 5): ${failedNames.join(', ')}`)
  }

  if (allPreviews.length === 0) return { error: 'לא ניתן לטעון תמונות preview.' }

  // ── Step 2: Tournament — each batch picks its best match ─────────────────────
  const batches: Preview[][] = []
  for (let i = 0; i < allPreviews.length; i += BATCH_SIZE) {
    batches.push(allPreviews.slice(i, i + BATCH_SIZE))
  }
  console.log(`[font-id] step-2: ${batches.length} batches × ${BATCH_SIZE}`)

  const makeBatchPrompt = (batch: Preview[]): string => {
    const imageLines = batch.map((p, i) => `  Image ${i + 2}: "${p.name}"`).join('\n')
    const nameLines  = batch.map((p, i) => `${i + 1}. ${p.name}`).join('\n')
    return `Hebrew font identification expert.

Image 1: user's image (unknown font).
${imageLines}

Each Image 2+ shows the Hebrew alphabet in a specific font.

Target font characteristics:
${analysis}

Compare Image 1 against each sample. Consider: letter shapes (especially א ג ד ה כ מ ע ר ש ת), stroke weight, terminal style, proportions.

Font list (copy name exactly):
${nameLines}

Reply with ONE line only:
BEST: ExactFontName

If none of the samples match, write: BEST: NONE`
  }

  const allFontNames = allPreviews.map(p => p.name)

  const t1 = Date.now()
  const batchTasks = batches.map((batch, batchIdx) => async (): Promise<string | null> => {
    try {
      const content = [
        imgBlock(imageBase64, imageMimeType),
        ...batch.map(p => imgBlock(p.base64, p.mimeType)),
        textBlock(makeBatchPrompt(batch)),
      ]
      const text     = await claudeCall(apiKey, 'claude-haiku-4-5-20251001', 40, content)
      const raw      = text.trim()
      const parsed   = text.match(/BEST:\s*(.+)/i)?.[1]?.trim() ?? ''
      const resolved = resolveMatch(parsed, allFontNames)
      console.log(`[font-id] batch ${batchIdx + 1}/${batches.length}: raw="${raw}" parsed="${parsed}" → ${resolved ?? 'NONE'}`)
      return resolved
    } catch (err) {
      console.error(`[font-id] batch ${batchIdx + 1} error:`, err)
      return null
    }
  })

  const rawWinners = await runConcurrent(batchTasks, BATCH_CONCUR)
  console.log(`[font-id] step-2 done in ${Date.now() - t1}ms`)
  console.log(`[font-id] batch results (raw):`, JSON.stringify(rawWinners))
  const winners = [...new Set(rawWinners.filter(Boolean) as string[])]
  console.log(`[font-id] finalists (${winners.length}): ${winners.join(', ')}`)

  if (winners.length === 0) {
    return { description: buildDescription(analysis), matches: allPreviews.slice(0, 3).map(p => p.name) }
  }

  // ── Step 3: Final — Sonnet compares all winners ──────────────────────────────
  // Cap at 20 to stay within image limit
  const finalWinners = winners.slice(0, 20)
  const winnerPreviews = finalWinners
    .map(name => allPreviews.find(p => p.name === name))
    .filter(Boolean) as Preview[]

  const winnerImageLines = winnerPreviews.map((p, i) => `  Image ${i + 2}: "${p.name}"`).join('\n')
  const winnerNameLines  = winnerPreviews.map((p, i) => `${i + 1}. ${p.name}`).join('\n')

  const finalPrompt = `You are a Hebrew font identification expert performing a final selection.

Image 1: user's image (unknown font).
${winnerImageLines}

These fonts were each selected as the best match from their group.

Target font characteristics:
${analysis}

Carefully compare Image 1 against each candidate. Focus on the most distinctive letterforms.

Font names (copy exactly):
${winnerNameLines}

Reply ONLY in this format:
DESCRIPTION: one sentence in Hebrew describing the matched font style
MATCH: ExactFontName
MATCH: ExactFontName
MATCH: ExactFontName

Order from best to least similar. Up to 3 MATCH lines.`

  try {
    const content = [
      imgBlock(imageBase64, imageMimeType),
      ...winnerPreviews.map(p => imgBlock(p.base64, p.mimeType)),
      textBlock(finalPrompt),
    ]
    const finalText = await claudeCall(apiKey, 'claude-sonnet-4-6', 200, content)
    console.log(`[font-id] step-3:\n${finalText}`)

    const finalDescription = finalText.match(/DESCRIPTION:\s*(.+)/i)?.[1]?.trim() ?? buildDescription(analysis)
    const matches = (finalText.match(/MATCH:\s*(.+)/gi) ?? [])
      .map(l => l.replace(/^MATCH:\s*/i, '').trim())
      .map(m => resolveMatch(m, allFontNames))
      .filter((m): m is string => m !== null)
      .filter((m, i, arr) => arr.indexOf(m) === i)
      .slice(0, 3)

    console.log(`[font-id] final: ${JSON.stringify(matches)}`)
    return {
      description: finalDescription,
      matches: matches.length > 0 ? matches : finalWinners.slice(0, 3),
    }
  } catch (err) {
    console.error('[font-id] step-3 failed:', err)
    return { description: buildDescription(analysis), matches: finalWinners.slice(0, 3) }
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

  // HTTP-check the first 5 URLs
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

// Resolve Claude's output to an exact DB name by normalizing spaces/separators.
// "Fb Galbyan Light" and "FbGalbyan Light" both normalize to "fbgalbyanlight".
function resolveMatch(claudeName: string, fontNames: string[]): string | null {
  if (!claudeName || claudeName.toUpperCase() === 'NONE') return null
  if (fontNames.includes(claudeName)) return claudeName
  const norm = (s: string) => s.toLowerCase().replace(/[\s_-]/g, '')
  const target = norm(claudeName)
  return fontNames.find(n => norm(n) === target) ?? null
}

function buildDescription(analysis: string): string {
  const serif  = analysis.match(/SERIF:\s*(\w+)/i)?.[1]?.toLowerCase() === 'yes'
  const weight = analysis.match(/WEIGHT:\s*(\w+)/i)?.[1] ?? ''
  return `פונט ${serif ? 'סריף' : 'סאן-סריף'} במשקל ${weight}`
}

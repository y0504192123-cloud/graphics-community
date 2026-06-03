'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Font } from '@/types'

const WEIGHT_SYNONYMS: Record<string, string[]> = {
  thin:    ['thin', 'hairline', 'דק', 'דקיק'],
  light:   ['light', 'lite', 'קל', 'לייט'],
  regular: ['regular', 'normal', 'book', 'roman', 'רגיל', 'נורמל'],
  medium:  ['medium', 'demi', 'בינוני'],
  bold:    ['bold', 'semibold', 'semi-bold', 'מודגש', 'בולד'],
  black:   ['black', 'heavy', 'ultra', 'extrabold', 'extra-bold', 'שחור'],
}

function weightScore(font: Font, weight: string): number {
  if (!weight) return 0
  const synonyms = WEIGHT_SYNONYMS[weight] ?? [weight]
  const corpus = [font.name, font.style ?? '', ...(font.tags ?? [])].join(' ').toLowerCase()
  return synonyms.some(syn => corpus.includes(syn)) ? 1 : 0
}

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
    .select('id, name, name_hebrew, category, style, description, tags, company, preview_image_url, font_file_path, is_free, price, download_url, created_at')
    .order('name', { ascending: true })

  const fonts = (fontsData ?? []) as Font[]
  console.log(`[font-id] fonts in DB: ${fonts.length}`)
  if (!fonts.length) return { error: 'מאגר הפונטים ריק. הוסף פונטים מפאנל הניהול.' }

  // ── Step 1: Quick analysis — PREFIX + WEIGHT ───────────────────────────────
  const step1Prompt = `You are a Hebrew typography expert. Analyze the font in this image.

Reply ONLY in this exact format (no other text):
DESCRIPTION: one sentence in Hebrew describing the visual font style
PREFIX: the company/foundry prefix visible at the start of the font name (e.g. FB, AA, ML, DL, MN, YD, AM). Write ONLY the 2-4 uppercase letters. If not identifiable, write UNKNOWN
WEIGHT: one of: thin | light | regular | medium | bold | black`

  try {
    const res1 = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 120,
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: imageMimeType, data: imageBase64 } },
          { type: 'text', text: step1Prompt },
        ]}],
      }),
    })
    const data1 = await res1.json()
    if (!res1.ok) return { error: data1.error?.message ?? 'שגיאה בתקשורת עם Claude' }

    const text1: string = data1.content?.[0]?.text ?? ''
    console.log(`[font-id] step-1:\n${text1}`)

    const description   = text1.match(/DESCRIPTION:\s*(.+)/i)?.[1]?.trim() ?? ''
    const rawPrefix     = (text1.match(/PREFIX:\s*(.+)/i)?.[1] ?? '').trim().toUpperCase()
    const weight        = (text1.match(/WEIGHT:\s*(.+)/i)?.[1] ?? '').trim().toLowerCase()
    const companyPrefix = (rawPrefix === 'UNKNOWN' || rawPrefix === '') ? '' : rawPrefix

    console.log(`[font-id] step-1 parsed: prefix="${companyPrefix}" weight="${weight}"`)

    // ── Step 2: Filter candidates by PREFIX ────────────────────────────────────
    let candidates: Font[]

    if (companyPrefix) {
      const p = companyPrefix.toLowerCase()
      candidates = fonts.filter(f => {
        const nameLower    = f.name.toLowerCase()
        const companyLower = (f.company ?? '').toLowerCase().replace(/[_\-\s]/g, '')
        return (
          nameLower.startsWith(p + ' ') ||
          nameLower.startsWith(p + '-') ||
          nameLower.startsWith(p + '_') ||
          companyLower === p ||
          companyLower.startsWith(p)
        )
      })
      console.log(`[font-id] step-2: prefix "${companyPrefix}" → ${candidates.length} fonts`)

      // Within company, sort so weight-matched fonts come first
      if (weight) {
        candidates = [
          ...candidates.filter(f => weightScore(f, weight) > 0),
          ...candidates.filter(f => weightScore(f, weight) === 0),
        ]
      }
    } else {
      // No prefix identified — lightweight scoring fallback
      console.log(`[font-id] step-2: no prefix, scoring fallback`)
      const synonyms = weight ? (WEIGHT_SYNONYMS[weight] ?? [weight]) : []
      candidates = fonts
        .map(f => {
          const corpus = [f.name, f.name_hebrew ?? '', f.category ?? '', f.style ?? '', ...(f.tags ?? [])].join(' ').toLowerCase()
          let score = synonyms.some(syn => corpus.includes(syn)) ? 4 : 0
          if (f.preview_image_url) score += 1
          return { font: f, score }
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 40)
        .map(s => s.font)
    }

    if (candidates.length === 0) {
      return { description, error: `לא נמצאו פונטים עם הקידומת "${companyPrefix}" במאגר.` }
    }

    // ── Step 3: Visual comparison ────────────────────────────────────────────
    const withPreviews = candidates.filter(f => f.preview_image_url).slice(0, 20)

    if (withPreviews.length === 0) {
      return { description, matches: candidates.slice(0, 3).map(f => f.name) }
    }

    const previewImages = await Promise.all(
      withPreviews.map(async (font) => {
        try {
          const r = await fetch(font.preview_image_url!)
          if (!r.ok) return null
          const buf = await r.arrayBuffer()
          const base64 = Buffer.from(buf).toString('base64')
          const ct = r.headers.get('content-type') ?? 'image/png'
          return { name: font.name, base64, mimeType: ct.split(';')[0].trim() }
        } catch { return null }
      })
    )
    const previews = previewImages.filter(Boolean) as { name: string; base64: string; mimeType: string }[]

    if (previews.length === 0) {
      return { description, matches: candidates.slice(0, 3).map(f => f.name) }
    }

    console.log(`[font-id] step-3: ${previews.length} previews → Claude`)

    const imageList = previews.map((p, i) => `  Image ${i + 2}: "${p.name}"`).join('\n')
    const nameList  = previews.map((p, i) => `${i + 1}. ${p.name}`).join('\n')

    const step3Prompt = `You are a Hebrew font identification expert.

Image 1: the user's input — Hebrew text in an unknown font.
${imageList}

Each of Images 2+ shows the full Hebrew alphabet ("אבגדהוזחטיכלמנסעפצקרשת") rendered in a specific font.

Compare Image 1 against every sample. Focus on:
- Letter shapes (especially א ג ד ה כ מ ע ר ש ת)
- Stroke weight and contrast
- Serif presence and style
- Overall proportions and spacing

FONT NAME LIST (copy names exactly, character-for-character):
${nameList}

Reply ONLY in this exact format:
DESCRIPTION: one sentence in Hebrew about the match
MATCH: ExactFontName
MATCH: ExactFontName
MATCH: ExactFontName

Rules: order best → worst match · up to 3 MATCH lines · if nothing fits write MATCH: NONE`

    const res3 = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 250,
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: imageMimeType, data: imageBase64 } },
          ...previews.map(p => ({ type: 'image' as const, source: { type: 'base64' as const, media_type: p.mimeType, data: p.base64 } })),
          { type: 'text', text: step3Prompt },
        ]}],
      }),
    })
    const data3 = await res3.json()

    if (!res3.ok) {
      console.log(`[font-id] step-3 API error: ${data3.error?.message}`)
      return { description, matches: candidates.slice(0, 3).map(f => f.name) }
    }

    const text3: string = data3.content?.[0]?.text ?? ''
    console.log(`[font-id] step-3 response:\n${text3}`)

    const finalDescription = text3.match(/DESCRIPTION:\s*(.+)/i)?.[1]?.trim() ?? description
    const fontNames = fonts.map(f => f.name)
    const matches = (text3.match(/MATCH:\s*(.+)/gi) ?? [])
      .map(l => l.replace(/^MATCH:\s*/i, '').trim())
      .filter(m => m && m.toUpperCase() !== 'NONE' && fontNames.includes(m))
      .filter((m, i, arr) => arr.indexOf(m) === i)
      .slice(0, 3)

    console.log(`[font-id] matches: ${JSON.stringify(matches)}`)

    return {
      description: finalDescription,
      matches: matches.length > 0 ? matches : candidates.slice(0, 3).map(f => f.name),
    }
  } catch (err) {
    console.error('[font-id] error:', err)
    return { error: 'שגיאת רשת — לא ניתן להתחבר ל-Anthropic' }
  }
}

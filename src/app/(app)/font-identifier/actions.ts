'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Font } from '@/types'

// Hebrew + English synonyms per weight class
const WEIGHT_SYNONYMS: Record<string, string[]> = {
  thin:    ['thin', 'hairline', 'דק', 'דקיק'],
  light:   ['light', 'lite', 'קל', 'לייט'],
  regular: ['regular', 'normal', 'book', 'roman', 'רגיל', 'נורמל'],
  medium:  ['medium', 'demi', 'בינוני'],
  bold:    ['bold', 'semibold', 'semi-bold', 'מודגש', 'בולד'],
  black:   ['black', 'heavy', 'ultra', 'extrabold', 'extra-bold', 'שחור'],
}

// ── Local scoring ─────────────────────────────────────────────────────────────
function scoreFont(
  font: Font,
  category: string,
  weight: string,
  keywords: string[],
  companyPrefix: string,   // e.g. "FB", "AA", "ML"  — empty string if unknown
): number {
  let score = 0

  const corpus = [
    font.name,
    font.name_hebrew ?? '',
    font.category ?? '',
    font.style ?? '',
    font.description ?? '',
    ...(font.tags ?? []),
  ].join(' ').toLowerCase()

  const fontCat = (font.category ?? '').toLowerCase()

  // ── Company prefix: strongest signal (+20) ──────────────────────────────────
  if (companyPrefix) {
    const p = companyPrefix.toLowerCase().replace(/[_\-\s]/g, '')
    const nameLower    = font.name.toLowerCase()
    const companyLower = (font.company ?? '').toLowerCase().replace(/[_\-\s]/g, '')

    // Font name starts with the prefix followed by space, dash, or underscore
    if (
      nameLower.startsWith(p + ' ') ||
      nameLower.startsWith(p + '_') ||
      nameLower.startsWith(p + '-')
    ) {
      score += 20
    } else if (companyLower === p || companyLower.startsWith(p)) {
      // Company field matches
      score += 15
    }
  }

  // ── Category ─────────────────────────────────────────────────────────────────
  if (category === 'sans-serif' || category === 'sans serif') {
    if (corpus.includes('sans')) score += 8
    if (fontCat.includes('serif') && !fontCat.includes('sans')) score -= 4
  } else if (category === 'serif' || category === 'slab-serif') {
    if (fontCat.includes('serif') && !fontCat.includes('sans')) score += 8
    if (fontCat.includes('sans')) score -= 4
  } else if (category === 'display') {
    if (corpus.includes('display') || corpus.includes('decorative') ||
        corpus.includes('תצוגה') || corpus.includes('כותרת')) score += 8
  } else if (category === 'script' || category === 'handwriting') {
    if (corpus.includes('script') || corpus.includes('brush') ||
        corpus.includes('handwriting') || corpus.includes('כתב יד')) score += 8
  } else if (category === 'monospace') {
    if (corpus.includes('mono') || corpus.includes('typewriter') || corpus.includes('code')) score += 8
  } else if (category) {
    if (corpus.includes(category)) score += 8
  }

  // ── Weight (with Hebrew synonyms) ────────────────────────────────────────────
  if (weight) {
    const synonyms = WEIGHT_SYNONYMS[weight] ?? [weight]
    if (synonyms.some(syn => corpus.includes(syn))) score += 4
  }

  // ── Style keywords ────────────────────────────────────────────────────────────
  for (const kw of keywords) {
    if (kw.length >= 3 && corpus.includes(kw)) score += 2
  }

  // ── Preview image bonus ───────────────────────────────────────────────────────
  if (font.preview_image_url) score += 0.5

  return score
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

  // ── Step 1: Visual analysis ──────────────────────────────────────────────────
  const step1Prompt = `You are a Hebrew font identification expert. Analyze the font used in this image.

Reply ONLY in this exact format (no other text):
DESCRIPTION: one sentence in Hebrew describing the visual font characteristics
CATEGORY: one of: serif | sans-serif | display | script | monospace | slab-serif
WEIGHT: one of: thin | light | regular | medium | bold | black
KEYWORDS: 4-8 comma-separated style keywords in English (e.g. modern, rounded, geometric, condensed, decorative, elegant, calligraphic, clean)
PREFIX: if the font name visually shows a company prefix like "FB", "AA", "ML", "DL" at the start — write it here (letters only, e.g. FB). If not visible, write UNKNOWN`

  try {
    const res1 = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 250,
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: imageMimeType, data: imageBase64 } },
          { type: 'text', text: step1Prompt },
        ]}],
      }),
    })
    const data1 = await res1.json()
    if (!res1.ok) return { error: data1.error?.message ?? 'שגיאה בתקשורת עם Claude' }

    const text1: string = data1.content?.[0]?.text ?? ''
    console.log(`[font-id] step-1 response:\n${text1}`)

    const description     = text1.match(/DESCRIPTION:\s*(.+)/i)?.[1]?.trim() ?? ''
    const category        = (text1.match(/CATEGORY:\s*(.+)/i)?.[1] ?? '').trim().toLowerCase()
    const weight          = (text1.match(/WEIGHT:\s*(.+)/i)?.[1] ?? '').trim().toLowerCase()
    const keywords        = (text1.match(/KEYWORDS:\s*(.+)/i)?.[1] ?? '')
      .split(',').map(k => k.trim().toLowerCase()).filter(Boolean)
    const rawPrefix       = (text1.match(/PREFIX:\s*(.+)/i)?.[1] ?? '').trim().toUpperCase()
    const companyPrefix   = (rawPrefix === 'UNKNOWN' || rawPrefix === '') ? '' : rawPrefix

    console.log(`[font-id] parsed: category="${category}" weight="${weight}" prefix="${companyPrefix}" keywords=${JSON.stringify(keywords)}`)

    // ── Step 2: Local scoring ────────────────────────────────────────────────────
    const scored = fonts
      .map(font => ({ font, score: scoreFont(font, category, weight, keywords, companyPrefix) }))
      .sort((a, b) => b.score - a.score)

    let candidates = scored.filter(s => s.score > 0).slice(0, 20).map(s => s.font)

    if (candidates.length < 10) {
      const extra = fonts
        .filter(f => f.preview_image_url && !candidates.find(c => c.id === f.id))
        .slice(0, 20 - candidates.length)
      candidates = [...candidates, ...extra]
    }

    console.log(`[font-id] step-2: ${candidates.length} candidates`)
    console.log(`[font-id] top-5: ${scored.slice(0, 5).map(s => `${s.font.name}(${s.score.toFixed(1)})`).join(', ')}`)

    // ── Step 3: Visual comparison with preview images ────────────────────────────
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

    console.log(`[font-id] step-3: sending ${previews.length} preview images to Claude`)

    // Numbered list: image index → font name
    const imageList = previews.map((p, i) => `  Image ${i + 2}: "${p.name}"`).join('\n')
    // Exact names list for the constraint
    const nameList  = previews.map((p, i) => `${i + 1}. ${p.name}`).join('\n')

    const step3Prompt = `You are a Hebrew font identification expert helping a user find a font.

Image 1: the user's input — contains Hebrew text in an unknown font.
${imageList}

Each of Images 2+ shows the full Hebrew alphabet ("אבגדהוזחטיכלמנסעפצקרשת") rendered in a specific font.

TASK: Compare the font in Image 1 with every sample image. Look at:
- Letter shapes and proportions
- Stroke contrast (thick/thin variation)
- Serifs presence and style
- Overall weight (light / regular / bold)
- Unique design details

FONT NAME LIST (use ONLY these exact spellings):
${nameList}

Reply ONLY in this exact format:
DESCRIPTION: one sentence in Hebrew describing the best visual match
MATCH: ExactFontName
MATCH: ExactFontName
MATCH: ExactFontName

Rules:
- Copy font names character-for-character from the list above
- Order from best match to least similar
- Include up to 3 MATCH lines; if nothing matches write: MATCH: NONE`

    const res3 = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 300,
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: imageMimeType, data: imageBase64 } },
          ...previews.map(p => ({ type: 'image', source: { type: 'base64', media_type: p.mimeType, data: p.base64 } })),
          { type: 'text', text: step3Prompt },
        ]}],
      }),
    })
    const data3 = await res3.json()

    if (!res3.ok) {
      console.log(`[font-id] step-3 failed: ${data3.error?.message}`)
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

    console.log(`[font-id] final matches: ${JSON.stringify(matches)}`)

    return {
      description: finalDescription,
      matches: matches.length > 0 ? matches : candidates.slice(0, 3).map(f => f.name),
    }
  } catch {
    return { error: 'שגיאת רשת — לא ניתן להתחבר ל-Anthropic' }
  }
}

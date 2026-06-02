'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Font, FontWeight } from '@/types'

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
  const [{ data: fontsData }, { data: weightsData }] = await Promise.all([
    admin.from('fonts').select('*').order('name', { ascending: true }),
    admin.from('font_weights').select('font_id, weight_name').order('created_at', { ascending: true }),
  ])

  const fonts    = (fontsData  ?? []) as Font[]
  const weights  = (weightsData ?? []) as Pick<FontWeight, 'font_id' | 'weight_name'>[]

  console.log(`[font-identifier] fonts in DB: ${fonts.length}`)
  if (!fonts.length) return { error: 'מאגר הפונטים ריק. הוסף פונטים מפאנל הניהול.' }

  // Group weights by font_id
  const weightsByFont: Record<string, string[]> = {}
  for (const w of weights) {
    if (!weightsByFont[w.font_id]) weightsByFont[w.font_id] = []
    weightsByFont[w.font_id].push(w.weight_name)
  }

  // Format: "ExactName | info..." — the part before the first " | " is what Claude must echo back
  const fontList = fonts.map(f => {
    const extras: string[] = []
    if (f.name_hebrew)                extras.push(`Hebrew: ${f.name_hebrew}`)
    if (f.category)                   extras.push(`Category: ${f.category}`)
    if (f.style)                      extras.push(`Style: ${f.style}`)
    if (f.description)                extras.push(`Desc: ${f.description}`)
    if (f.tags?.length)               extras.push(`Tags: ${f.tags.join(', ')}`)
    const fw = weightsByFont[f.id]
    if (fw?.length)                   extras.push(`Weights: ${fw.join(', ')}`)
    return extras.length ? `${f.name} | ${extras.join(' | ')}` : f.name
  }).join('\n')

  console.log(`[font-identifier] sending ${fonts.length} fonts to Claude`)
  console.log(`[font-identifier] first 3 entries:\n${fontList.split('\n').slice(0, 3).join('\n')}`)

  const prompt = `You are a Hebrew font identification expert. Analyze the font used in this image.

FONT DATABASE (${fonts.length} fonts):
${fontList}

Each line is formatted as:   ExactFontName | additional info...
The text BEFORE the first " | " is the exact name you must use.

Reply ONLY in this exact format (no other text):
DESCRIPTION: one sentence in Hebrew describing the visual font characteristics
MATCH: ExactFontName
MATCH: ExactFontName
MATCH: ExactFontName

Rules:
- In every MATCH line write ONLY the exact name from before the " | " — nothing else
- Use up to 3 best matches, or fewer if confident
- If no match at all, write: MATCH: NONE`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: imageMimeType, data: imageBase64 } },
            { type: 'text', text: prompt },
          ],
        }],
      }),
    })
    const data = await res.json()
    if (!res.ok) return { error: data.error?.message ?? 'שגיאה בתקשורת עם Claude' }

    const text: string = data.content?.[0]?.text ?? ''
    console.log(`[font-identifier] Claude raw response:\n${text}`)

    const descLine  = text.match(/DESCRIPTION:\s*(.+)/i)
    const description = descLine?.[1]?.trim()

    const matchLines = text.match(/MATCH:\s*(.+)/gi) ?? []
    const rawMatches = matchLines
      .map(l => l.replace(/^MATCH:\s*/i, '').trim())
      .filter(m => m && m.toUpperCase() !== 'NONE')

    console.log(`[font-identifier] raw MATCH values: ${JSON.stringify(rawMatches)}`)

    // Multi-strategy resolution: exact → case-insensitive → raw starts with name → name starts with raw
    const fontNames = fonts.map(f => f.name)
    const resolved = rawMatches
      .map(raw => {
        if (fontNames.includes(raw)) return raw
        const ci = fontNames.find(n => n.toLowerCase() === raw.toLowerCase())
        if (ci) return ci
        // Claude may have appended extra text — check if raw starts with a known name
        const sw = fontNames.find(n => raw.toLowerCase().startsWith(n.toLowerCase() + ' ') || raw.toLowerCase().startsWith(n.toLowerCase() + '/') || raw.toLowerCase().startsWith(n.toLowerCase() + '|'))
        if (sw) return sw
        // Or if the name starts with what Claude returned (prefix match)
        const fw = fontNames.find(n => n.toLowerCase().startsWith(raw.toLowerCase()))
        if (fw) return fw
        return null
      })
      .filter((m): m is string => m !== null)
      .filter((m, i, arr) => arr.indexOf(m) === i)
      .slice(0, 3)

    console.log(`[font-identifier] resolved matches: ${JSON.stringify(resolved)}`)

    return { matches: resolved, description }
  } catch {
    return { error: 'שגיאת רשת — לא ניתן להתחבר ל-Anthropic' }
  }
}

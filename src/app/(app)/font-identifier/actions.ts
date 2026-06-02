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

  const fonts   = (fontsData  ?? []) as Font[]
  const weights = (weightsData ?? []) as Pick<FontWeight, 'font_id' | 'weight_name'>[]

  console.log(`[font-identifier] fonts in DB: ${fonts.length}`)
  if (!fonts.length) return { error: 'מאגר הפונטים ריק. הוסף פונטים מפאנל הניהול.' }

  const weightsByFont: Record<string, string[]> = {}
  for (const w of weights) {
    if (!weightsByFont[w.font_id]) weightsByFont[w.font_id] = []
    weightsByFont[w.font_id].push(w.weight_name)
  }

  const fontList = fonts.map(f => {
    const extras: string[] = []
    if (f.name_hebrew)  extras.push(`Hebrew: ${f.name_hebrew}`)
    if (f.category)     extras.push(`Category: ${f.category}`)
    if (f.style)        extras.push(`Style: ${f.style}`)
    if (f.description)  extras.push(`Desc: ${f.description}`)
    if (f.tags?.length) extras.push(`Tags: ${f.tags.join(', ')}`)
    const fw = weightsByFont[f.id]
    if (fw?.length)     extras.push(`Weights: ${fw.join(', ')}`)
    return extras.length ? `${f.name} | ${extras.join(' | ')}` : f.name
  }).join('\n')

  console.log(`[font-identifier] sending ${fonts.length} fonts to Claude (text pass)`)
  console.log(`[font-identifier] first 3 entries:\n${fontList.split('\n').slice(0, 3).join('\n')}`)

  // ── Step 1: text-based identification ───────────────────────────────────
  const textPrompt = `You are a Hebrew font identification expert. Analyze the font used in this image.

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
    const res1 = await fetch('https://api.anthropic.com/v1/messages', {
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
            { type: 'text', text: textPrompt },
          ],
        }],
      }),
    })
    const data1 = await res1.json()
    if (!res1.ok) return { error: data1.error?.message ?? 'שגיאה בתקשורת עם Claude' }

    const text1: string = data1.content?.[0]?.text ?? ''
    console.log(`[font-identifier] step-1 Claude response:\n${text1}`)

    const description1 = text1.match(/DESCRIPTION:\s*(.+)/i)?.[1]?.trim()
    const rawMatches = (text1.match(/MATCH:\s*(.+)/gi) ?? [])
      .map(l => l.replace(/^MATCH:\s*/i, '').trim())
      .filter(m => m && m.toUpperCase() !== 'NONE')

    console.log(`[font-identifier] raw MATCH values: ${JSON.stringify(rawMatches)}`)

    const fontNames = fonts.map(f => f.name)
    const textResolved = rawMatches
      .map(raw => {
        if (fontNames.includes(raw)) return raw
        const ci = fontNames.find(n => n.toLowerCase() === raw.toLowerCase())
        if (ci) return ci
        const sw = fontNames.find(n =>
          raw.toLowerCase().startsWith(n.toLowerCase() + ' ') ||
          raw.toLowerCase().startsWith(n.toLowerCase() + '/') ||
          raw.toLowerCase().startsWith(n.toLowerCase() + '|'))
        if (sw) return sw
        const fw = fontNames.find(n => n.toLowerCase().startsWith(raw.toLowerCase()))
        if (fw) return fw
        return null
      })
      .filter((m): m is string => m !== null)
      .filter((m, i, arr) => arr.indexOf(m) === i)
      .slice(0, 3)

    console.log(`[font-identifier] text-resolved: ${JSON.stringify(textResolved)}`)

    // ── Step 2: visual comparison with preview images ──────────────────────
    const candidates = textResolved
      .map(name => fonts.find(f => f.name === name))
      .filter((f): f is Font => !!f && !!f.preview_image_url)

    if (candidates.length === 0) {
      return { matches: textResolved, description: description1 }
    }

    const previewImages = await Promise.all(
      candidates.map(async (font) => {
        try {
          const imgRes = await fetch(font.preview_image_url!)
          if (!imgRes.ok) return null
          const buf = await imgRes.arrayBuffer()
          const base64 = Buffer.from(buf).toString('base64')
          const ct = imgRes.headers.get('content-type') ?? 'image/png'
          return { name: font.name, base64, mimeType: ct.split(';')[0].trim() }
        } catch { return null }
      })
    )
    const validPreviews = previewImages.filter(Boolean) as { name: string; base64: string; mimeType: string }[]

    if (validPreviews.length === 0) {
      return { matches: textResolved, description: description1 }
    }

    const candidateLabels = validPreviews.map((p, i) => `תמונה ${i + 2}: "${p.name}"`).join('\n')
    const visualPrompt = `אתה מומחה זיהוי פונטים עברים. בצע השוואה ויזואלית.

תמונה 1: תמונת הקלט של המשתמש עם טקסט עברי.
${candidateLabels}

תמונות 2+ הן דוגמאות פונט המציגות את האלפבית העברי המלא ("אבגדהוזחטיכלמנסעפצקרשת").

השווה את סגנון הפונט בתמונה 1 לכל דוגמת פונט ודרג את ההתאמות הטובות ביותר.

ענה ONLY בפורמט הזה:
DESCRIPTION: משפט אחד בעברית המתאר איכות ההתאמה
MATCH: FontName
MATCH: FontName

כללים:
- כתוב רק שמות פונט מהרשימה: ${validPreviews.map(p => p.name).join(', ')}
- סדר לפי דמיון ויזואלי הטוב ביותר
- השמט פונטים שלא תואמים ויזואלית`

    const visualContent = [
      { type: 'image', source: { type: 'base64', media_type: imageMimeType, data: imageBase64 } },
      ...validPreviews.map(p => ({
        type: 'image',
        source: { type: 'base64', media_type: p.mimeType, data: p.base64 },
      })),
      { type: 'text', text: visualPrompt },
    ]

    const res2 = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 300,
        messages: [{ role: 'user', content: visualContent }],
      }),
    })
    const data2 = await res2.json()
    if (!res2.ok) {
      console.log(`[font-identifier] visual step failed: ${data2.error?.message}`)
      return { matches: textResolved, description: description1 }
    }

    const text2: string = data2.content?.[0]?.text ?? ''
    console.log(`[font-identifier] step-2 visual response:\n${text2}`)

    const description2 = text2.match(/DESCRIPTION:\s*(.+)/i)?.[1]?.trim()
    const visualResolved = (text2.match(/MATCH:\s*(.+)/gi) ?? [])
      .map(l => l.replace(/^MATCH:\s*/i, '').trim())
      .filter(m => m && m.toUpperCase() !== 'NONE' && fontNames.includes(m))
      .filter((m, i, arr) => arr.indexOf(m) === i)
      .slice(0, 3)

    console.log(`[font-identifier] visual-resolved: ${JSON.stringify(visualResolved)}`)

    return {
      matches: visualResolved.length > 0 ? visualResolved : textResolved,
      description: description2 ?? description1,
    }
  } catch {
    return { error: 'שגיאת רשת — לא ניתן להתחבר ל-Anthropic' }
  }
}
